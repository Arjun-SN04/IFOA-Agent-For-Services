'use strict';

const cron       = require('node-cron');
const Airlines   = require('../models/Airlines');
const Individual = require('../models/Individual');
const Renewal    = require('../models/Renewal');
const {
  sendExpiryReminder,
  sendIndividualRenewalConfirmation,
  sendAirlineRenewalConfirmation,
} = require('../services/emailService');

const UNLIMITED = 'Unlimited Plan';

// Window boundaries in milliseconds
const MS_PER_DAY  = 24 * 60 * 60 * 1000;
const WINDOWS = [
  { days: 60, field: 'expiryReminder60SentAt' },
  { days: 30, field: 'expiryReminder30SentAt' },
];

async function runReminders() {
  const now = Date.now();

  for (const { days, field } of WINDOWS) {
    const windowStart = new Date(now + (days - 3) * MS_PER_DAY);
    const windowEnd   = new Date(now + (days + 3) * MS_PER_DAY);
    const cooldown    = new Date(now - 20 * MS_PER_DAY); // don't re-send within 20 days

    // Only send reminders to records that:
    // 1. Are expiring within the window
    // 2. Are Active subscriptions (not Pending / Inactive)
    // 3. Are NOT on an Unlimited Plan (they never expire)
    // 4. Haven't received this reminder within the cooldown period
    // 5. Do NOT already have a queued renewal (nextRenewal.paidAt set) — they already renewed
    const baseQuery = {
      expirationDate: { $gte: windowStart, $lte: windowEnd },
      status: 'Active',
      subscriptionPlan: { $ne: UNLIMITED },
      $or: [{ [field]: { $exists: false } }, { [field]: { $lt: cooldown } }],
      // Skip records where the user has already paid for a renewal
      'nextRenewal.paidAt': { $in: [null, undefined] },
    };

    const [airlines, individuals] = await Promise.all([
      Airlines.find(baseQuery).lean(),
      Individual.find(baseQuery).lean(),
    ]);

    for (const doc of airlines) {
      try {
        const actualDays = doc.expirationDate
          ? Math.ceil((new Date(doc.expirationDate) - Date.now()) / MS_PER_DAY)
          : days;
        await sendExpiryReminder(doc, true, actualDays);
        await Airlines.findByIdAndUpdate(doc._id, { $set: { [field]: new Date() } });
      } catch (e) {
        console.error(`[reminderCron] airline ${doc._id} ${days}d failed:`, e.message);
      }
    }

    for (const doc of individuals) {
      try {
        const actualDays = doc.expirationDate
          ? Math.ceil((new Date(doc.expirationDate) - Date.now()) / MS_PER_DAY)
          : days;
        await sendExpiryReminder(doc, false, actualDays);
        await Individual.findByIdAndUpdate(doc._id, { $set: { [field]: new Date() } });
      } catch (e) {
        console.error(`[reminderCron] individual ${doc._id} ${days}d failed:`, e.message);
      }
    }

    if (airlines.length + individuals.length > 0) {
      console.log(`[reminderCron] ${days}-day window: ${airlines.length} airlines, ${individuals.length} individuals notified`);
    }
  }
}

/**
 * activateMaturedRenewals
 *
 * Finds all queued Renewal docs whose activationDate has now passed
 * and promotes them to the live subscription on the parent record.
 * Runs daily so the worst-case delay is ~24 hours after expiry.
 *
 * After activating each renewal, sends a renewal confirmation email
 * to the subscriber so they know their plan is now live.
 */
async function activateMaturedRenewals() {
  const now = new Date();

  // Find all queued renewals whose activation window has arrived
  const due = await Renewal.find({
    status:         'queued',
    activationDate: { $lte: now },
  }).lean();

  if (!due.length) return;
  console.log(`[renewalCron] ${due.length} renewal(s) ready to activate`);

  for (const renewal of due) {
    const Model = renewal.registrationModel === 'Individual' ? Individual : Airlines;
    try {
      const doc = await Model.findById(renewal.registrationId);

      // Safety: only promote if this renewal is still the one queued on the record
      if (!doc || String(doc.nextRenewalId) !== String(renewal._id)) {
        // Already superseded or record gone — just mark it
        await Renewal.findByIdAndUpdate(renewal._id, { $set: { status: 'superseded' } });
        continue;
      }

      // Safety: do NOT activate if the current plan is still live.
      // This guards against test backdating where renewal.activationDate was
      // manually set to the past but the subscription's expirationDate is still future.
      // For Unlimited Plan docs there is no expirationDate — skip this guard.
      const docExpiry = doc.expirationDate ? new Date(doc.expirationDate) : null;
      if (docExpiry && docExpiry > now) {
        console.log(`[renewalCron] Skipping renewal ${renewal._id} — current plan still active until ${docExpiry.toISOString()}`);
        continue;
      }

      // Compute expirationDate: use stored expiresAt if present, otherwise derive from plan.
      // This covers old Renewal docs created before expiresAt was persisted.
      let expiresAt = renewal.expiresAt;
      if (!expiresAt && renewal.plan !== 'Unlimited Plan') {
        const base = renewal.activationDate || now;
        const d = new Date(base);
        if (renewal.plan === '1 Year Subscription Plan') {
          d.setFullYear(d.getFullYear() + 1);
          expiresAt = d;
        } else if (renewal.plan === 'Multiple Years Subscription Plan') {
          d.setFullYear(d.getFullYear() + (renewal.multiYearCount || 3));
          expiresAt = d;
        }
      }

      const update = {
        subscriptionPlan:       renewal.plan,
        subscriptionDate:       renewal.activationDate || now,
        invoiceNumber:          renewal.invoiceNumber || null,
        invoiceStatus:          'Paid',
        paymentStatus:          'paid',
        isPaid:                 true,
        status:                 'Active',
        isFormCompleted:        true,
        expiryReminder60SentAt: null,
        expiryReminder30SentAt: null,
        ...(expiresAt ? { expirationDate: expiresAt } : {}),
        ...(renewal.multiYearCount ? { multiYearCount: renewal.multiYearCount } : {}),
        // Individual: sync price field
        ...(renewal.registrationModel === 'Individual' && renewal.price
          ? { price: renewal.price }
          : {}),
        // Airlines: restore committed holder count + amountPaid + totalAmount
        ...(renewal.registrationModel !== 'Individual' ? {
          ...(renewal.committedCount
            ? { committedCount: renewal.committedCount, holderCountValue: String(renewal.committedCount) }
            : {}),
          ...(renewal.price ? { amountPaid: renewal.price, totalAmount: renewal.price } : {}),
        } : {}),
      };

      // nextRenewal is a typed subdocument — $unset leaves an empty shell.
      // Null each field explicitly so frontend checks (nextRenewal.paidAt) return falsy.
      const updatedDoc = await Model.findByIdAndUpdate(renewal.registrationId, {
        $set:   {
          ...update,
          'nextRenewal.paidAt':         null,
          'nextRenewal.plan':           null,
          'nextRenewal.activationDate': null,
          'nextRenewal.expiresAt':      null,
          'nextRenewal.invoiceNumber':  null,
          'nextRenewal.price':          null,
        },
        $unset: { nextRenewalId: 1 },
      }, { new: true });

      await Renewal.findByIdAndUpdate(renewal._id, {
        $set: { status: 'active', activatedAt: now, activatedByAdmin: false },
      });

      console.log(`[renewalCron] Activated renewal ${renewal._id} for ${renewal.registrationModel} ${renewal.registrationId}`);

      // ── Send renewal activation email ────────────────────────────────────
      // The updatedDoc still has lastRenewal populated from when payment was made,
      // which the email template uses for plan/date details.
      if (updatedDoc) {
        const sendFn = renewal.registrationModel === 'Individual'
          ? sendIndividualRenewalConfirmation
          : sendAirlineRenewalConfirmation;
        sendFn(updatedDoc).catch((e) =>
          console.error(`[renewalCron] Email failed for renewal ${renewal._id}:`, e.message)
        );
      }
    } catch (e) {
      console.error(`[renewalCron] Failed to activate renewal ${renewal._id}:`, e.message);
    }
  }
}

function startSubscriptionReminderCron() {
  // Run daily at 8:00 AM UTC
  cron.schedule('0 8 * * *', () => {
    console.log('[reminderCron] Running subscription expiry check...');
    runReminders().catch((e) => console.error('[reminderCron] Error:', e.message));
    activateMaturedRenewals().catch((e) => console.error('[renewalCron] Error:', e.message));
  });
  console.log('[reminderCron] Scheduled — runs daily at 08:00 UTC');
}

module.exports = { startSubscriptionReminderCron, activateMaturedRenewals };

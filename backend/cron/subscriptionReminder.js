'use strict';

const cron       = require('node-cron');
const Airlines   = require('../models/Airlines');
const Individual = require('../models/Individual');
const Renewal    = require('../models/Renewal');
const { sendExpiryReminder } = require('../services/emailService');

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

    const airlineQuery = {
      expirationDate: { $gte: windowStart, $lte: windowEnd },
      status: 'Active',
      subscriptionPlan: { $ne: UNLIMITED },
      $or: [{ [field]: { $exists: false } }, { [field]: { $lt: cooldown } }],
    };
    const individualQuery = { ...airlineQuery };

    const [airlines, individuals] = await Promise.all([
      Airlines.find(airlineQuery).lean(),
      Individual.find(individualQuery).lean(),
    ]);

    for (const doc of airlines) {
      try {
        await sendExpiryReminder(doc, true, days);
        await Airlines.findByIdAndUpdate(doc._id, { $set: { [field]: new Date() } });
      } catch (e) {
        console.error(`[reminderCron] airline ${doc._id} ${days}d failed:`, e.message);
      }
    }

    for (const doc of individuals) {
      try {
        await sendExpiryReminder(doc, false, days);
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

      const update = {
        subscriptionPlan:       renewal.plan,
        subscriptionDate:       now,
        expirationDate:         renewal.expiresAt || null,
        invoiceStatus:          'Paid',
        paymentStatus:          'paid',
        isPaid:                 true,
        status:                 'Active',
        isFormCompleted:        true,
        expiryReminder60SentAt: null,
        expiryReminder30SentAt: null,
        nextRenewal:            null,
        nextRenewalId:          null,
        ...(renewal.multiYearCount ? { multiYearCount: renewal.multiYearCount } : {}),
        // Individual: sync price field
        ...(renewal.registrationModel === 'Individual' && renewal.price
          ? { price: renewal.price }
          : {}),
        // Airlines: restore committed holder count + amountPaid
        ...(renewal.registrationModel !== 'Individual' ? {
          ...(renewal.committedCount
            ? { committedCount: renewal.committedCount, holderCountValue: String(renewal.committedCount) }
            : {}),
          ...(renewal.price ? { amountPaid: renewal.price } : {}),
        } : {}),
      };

      await Model.findByIdAndUpdate(renewal.registrationId, { $set: update });
      await Renewal.findByIdAndUpdate(renewal._id, {
        $set: { status: 'active', activatedAt: now, activatedByAdmin: false },
      });

      console.log(`[renewalCron] Activated renewal ${renewal._id} for ${renewal.registrationModel} ${renewal.registrationId}`);
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

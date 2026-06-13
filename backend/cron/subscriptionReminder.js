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
 * Activation goes through performQueuedRenewalActivation — the SAME helper used
 * by the admin force-activate endpoint and the user auto-activate endpoint — so
 * holder removals, pricePerCertificate tier recompute, holderCount range,
 * Renewal doc status and the confirmation email behave identically no matter
 * which path triggers the activation.
 */
async function activateMaturedRenewals() {
  const now = new Date();
  // Lazy require avoids a circular import (paymentController is loaded by routes).
  const { performQueuedRenewalActivation } = require('../controller/paymentController');

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

      await performQueuedRenewalActivation(doc, Model, renewal.registrationModel, false);
      console.log(`[renewalCron] Activated renewal ${renewal._id} for ${renewal.registrationModel} ${renewal.registrationId}`);
    } catch (e) {
      console.error(`[renewalCron] Failed to activate renewal ${renewal._id}:`, e.message);
    }
  }
}

/**
 * activateMaturedGroupRenewals
 *
 * Activates queued holder-group renewals (stored on Airlines.holderGroups[].nextRenewal)
 * whose activationDate has passed. Independent of the Renewal collection.
 */
async function activateMaturedGroupRenewals() {
  const now = new Date();
  const { performQueuedGroupRenewals } = require('../controller/paymentController');
  const airlines = await Airlines.find({
    'holderGroups.nextRenewal.activationDate': { $lte: now, $ne: null },
  });
  if (!airlines.length) return;
  console.log(`[renewalCron] ${airlines.length} airline(s) with due group renewals`);
  for (const doc of airlines) {
    try {
      await performQueuedGroupRenewals(doc, Airlines);
    } catch (e) {
      console.error(`[renewalCron] Group renewal activation failed for ${doc._id}:`, e.message);
    }
  }
}

function startSubscriptionReminderCron() {
  // Run daily at 8:00 AM UTC
  cron.schedule('0 8 * * *', () => {
    console.log('[reminderCron] Running subscription expiry check...');
    runReminders().catch((e) => console.error('[reminderCron] Error:', e.message));
    activateMaturedRenewals().catch((e) => console.error('[renewalCron] Error:', e.message));
    activateMaturedGroupRenewals().catch((e) => console.error('[renewalCron][group] Error:', e.message));
  });
  console.log('[reminderCron] Scheduled — runs daily at 08:00 UTC');
}

module.exports = { startSubscriptionReminderCron, activateMaturedRenewals, activateMaturedGroupRenewals };

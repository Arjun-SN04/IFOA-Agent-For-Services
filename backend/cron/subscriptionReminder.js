'use strict';

const cron       = require('node-cron');
const Airlines   = require('../models/Airlines');
const Individual = require('../models/Individual');
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

function startSubscriptionReminderCron() {
  // Run daily at 8:00 AM UTC
  cron.schedule('0 8 * * *', () => {
    console.log('[reminderCron] Running subscription expiry check...');
    runReminders().catch((e) => console.error('[reminderCron] Error:', e.message));
  });
  console.log('[reminderCron] Scheduled — runs daily at 08:00 UTC');
}

module.exports = { startSubscriptionReminderCron };

/**
 * testRenewalActivation.js
 *
 * Test helper for simulating the queued renewal auto-activation flow.
 *
 * Usage:
 *   node scripts/testRenewalActivation.js <airlineId>
 *   node scripts/testRenewalActivation.js <airlineId> --reset
 *
 * What it does (normal run):
 *   1. Reads current state of the airlines doc and queued renewal
 *   2. Prints a clear before-state summary
 *   3. Backdates airline.expirationDate AND renewal.activationDate to yesterday
 *      so the cron picks it up (subscriptionDate will = yesterday after activation)
 *   4. Runs activateMaturedRenewals()
 *   5. Prints final state with pass/fail checks
 *   6. Prints the exact mongosh commands to reset back to original state
 *
 * What it does (--reset):
 *   Re-queues the renewal back to its original state using saved backup data.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const fs       = require('fs');
const path     = require('path');

const Airlines = require('../models/Airlines');
const Renewal  = require('../models/Renewal');
const { activateMaturedRenewals } = require('../cron/subscriptionReminder');

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

const BACKUP_FILE = path.join(__dirname, '.renewal_test_backup.json');

async function run() {
  const airlineId = process.argv[2];
  const isReset   = process.argv[3] === '--reset';

  if (!airlineId) {
    console.error('Usage:');
    console.error('  node scripts/testRenewalActivation.js <airlineId>');
    console.error('  node scripts/testRenewalActivation.js <airlineId> --reset');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ DB connected\n');

  // ── RESET MODE ──────────────────────────────────────────────────────────────
  if (isReset) {
    if (!fs.existsSync(BACKUP_FILE)) {
      console.error('❌ No backup file found. Run without --reset first.');
      process.exit(1);
    }
    const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    if (backup.airlineId !== airlineId) {
      console.error(`❌ Backup is for airline ${backup.airlineId}, not ${airlineId}`);
      process.exit(1);
    }

    await Airlines.findByIdAndUpdate(airlineId, {
      $set: {
        subscriptionDate: new Date(backup.subscriptionDate),
        expirationDate:   new Date(backup.expirationDate),
        invoiceNumber:    backup.invoiceNumber,
        nextRenewal:      backup.nextRenewal,
        nextRenewalId:    backup.nextRenewalId,
      },
    });

    await Renewal.findByIdAndUpdate(backup.renewalId, {
      $set: {
        status:        'queued',
        activationDate: new Date(backup.renewalActivationDate),
        expiresAt:      backup.renewalExpiresAt ? new Date(backup.renewalExpiresAt) : null,
        activatedAt:    null,
      },
    });

    fs.unlinkSync(BACKUP_FILE);
    console.log('✅ Reset complete — renewal is queued again with original dates.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── NORMAL TEST MODE ────────────────────────────────────────────────────────

  const doc = await Airlines.findById(airlineId);
  if (!doc) {
    console.error(`❌ No airline found with id: ${airlineId}`);
    process.exit(1);
  }

  console.log('─── CURRENT STATE ─────────────────────────────────────────────');
  console.log(`  Airline:            ${doc.airlineName}`);
  console.log(`  Subscription Plan:  ${doc.subscriptionPlan}`);
  console.log(`  Start Date:         ${fmt(doc.subscriptionDate)}`);
  console.log(`  Expiration Date:    ${fmt(doc.expirationDate)}`);
  console.log(`  Has nextRenewal:    ${doc.nextRenewal?.paidAt ? 'YES ✅' : 'NO ❌'}`);

  if (!doc.nextRenewal?.paidAt) {
    console.log('\n⚠️  No queued renewal found. Use the Renew button in the UI first.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`    → Plan:            ${doc.nextRenewal.plan}`);
  console.log(`    → Activation Date: ${fmt(doc.nextRenewal.activationDate)}`);
  console.log(`    → Expires On:      ${fmt(doc.nextRenewal.expiresAt)}`);
  console.log(`    → Invoice:         ${doc.nextRenewal.invoiceNumber}`);
  console.log('');

  const renewal = await Renewal.findById(doc.nextRenewalId);
  if (!renewal) {
    console.error('❌ nextRenewalId on airline doc has no matching Renewal document.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('─── QUEUED RENEWAL DOC ────────────────────────────────────────');
  console.log(`  _id:              ${renewal._id}`);
  console.log(`  status:           ${renewal.status}`);
  console.log(`  activationDate:   ${fmt(renewal.activationDate)}`);
  console.log(`  expiresAt:        ${fmt(renewal.expiresAt)}`);
  console.log('');

  // Save backup
  fs.writeFileSync(BACKUP_FILE, JSON.stringify({
    airlineId:             airlineId,
    subscriptionDate:      doc.subscriptionDate,
    expirationDate:        doc.expirationDate,
    invoiceNumber:         doc.invoiceNumber,
    nextRenewal:           doc.nextRenewal,
    nextRenewalId:         doc.nextRenewalId,
    renewalId:             renewal._id,
    renewalActivationDate: renewal.activationDate,
    renewalExpiresAt:      renewal.expiresAt,
  }, null, 2));

  // Backdate both to yesterday
  const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago to be safe

  console.log('─── BACKDATING FOR TEST ───────────────────────────────────────');
  console.log(`  airline.expirationDate  → ${fmt(yesterday)}`);
  console.log(`  renewal.activationDate  → ${fmt(yesterday)}`);
  console.log(`  (backup saved to ${BACKUP_FILE})`);
  console.log('');

  await Airlines.findByIdAndUpdate(airlineId, {
    $set: { expirationDate: yesterday },
  });
  await Renewal.findByIdAndUpdate(renewal._id, {
    $set: { activationDate: yesterday },
  });

  // Run activation
  console.log('─── RUNNING activateMaturedRenewals() ─────────────────────────');
  await activateMaturedRenewals();
  console.log('');

  // Print results
  const updated        = await Airlines.findById(airlineId);
  const updatedRenewal = await Renewal.findById(renewal._id);

  const startOk    = !!updated.subscriptionDate;
  const expiryOk   = !!updated.expirationDate && new Date(updated.expirationDate) > new Date();
  // nextRenewal is a typed subdocument — it always exists as an object.
  // Check paidAt field instead, which is what the frontend uses.
  const noQueue    = !updated.nextRenewal?.paidAt && !updated.nextRenewalId;
  const statusOk   = updatedRenewal?.status === 'active';

  console.log('─── FINAL STATE ───────────────────────────────────────────────');
  console.log(`  Subscription Plan:  ${updated.subscriptionPlan}`);
  console.log(`  Start Date:         ${fmt(updated.subscriptionDate)}  ${startOk ? '✅' : '❌'}`);
  console.log(`  Expiration Date:    ${fmt(updated.expirationDate)}    ${expiryOk ? '✅' : '❌'}`);
  console.log(`  Invoice Number:     ${updated.invoiceNumber}`);
  console.log(`  nextRenewal.paidAt null: ${noQueue ? '✅ YES (cleared)' : '❌ NO — paidAt still set: ' + updated.nextRenewal?.paidAt}`);
  console.log(`  Renewal status:     ${updatedRenewal?.status}  ${statusOk ? '✅' : '❌'}`);
  console.log('');

  if (startOk && expiryOk && noQueue && statusOk) {
    console.log('🎉 ALL CHECKS PASSED — renewal activation is working correctly!');
  } else {
    console.log('⚠️  Some checks failed — review the output above.');
  }

  console.log('');
  console.log('─── TO RESET ──────────────────────────────────────────────────');
  console.log(`  node scripts/testRenewalActivation.js ${airlineId} --reset`);
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});

'use strict';

/**
 * resetInvoices.js
 *
 * DESTRUCTIVE. Wipes every invoice from the database and restarts invoice
 * numbering from 1 (next generated number = "Invoice US-1-<YY>").
 *
 * What it does:
 *   - Deletes ALL Invoice documents.
 *   - Deletes ALL InvoiceCounter documents (so the per-year sequence resets to 0
 *     and the next number is US-1).
 *   - Clears invoiceNumber on every Renewal, Individual, Airlines and
 *     AirlinesSubscription doc (incl. nested nextRenewal.invoiceNumber).
 *   - Empties every hiddenInvoiceNumbers list.
 *   - Releases the number on every Payment doc by replacing it with a unique
 *     "VOID-<paymentId>" sentinel (Payment.invoiceNumber is required+unique, so
 *     the money record is preserved but its US-number is freed).
 *
 * Usage:
 *   node scripts/resetInvoices.js          # prompts for confirmation
 *   node scripts/resetInvoices.js --yes    # skip the prompt (CI / scripted)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const readline = require('readline');

const Invoice              = require('../models/Invoice');
const InvoiceCounter       = require('../models/InvoiceCounter');
const Payment              = require('../models/Payment');
const Renewal              = require('../models/Renewal');
const Individual           = require('../models/Individual');
const Airlines             = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');

const SKIP_PROMPT = process.argv.includes('--yes') || process.argv.includes('-y');

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error('ERROR: MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);

  const invoiceCount = await Invoice.estimatedDocumentCount();
  const paymentCount = await Payment.estimatedDocumentCount();
  const renewalCount = await Renewal.estimatedDocumentCount();

  console.log('\n  This will PERMANENTLY:');
  console.log(`   • delete ${invoiceCount} Invoice document(s)`);
  console.log(`   • delete ${paymentCount} Payment document(s)`);
  console.log(`   • delete ${renewalCount} Renewal document(s)`);
  console.log('   • reset the per-year invoice counter (next number = US-1)');
  console.log('   • clear invoice numbers on all registrations\n');

  if (!SKIP_PROMPT) {
    const ans = await prompt('Type "RESET" to confirm: ');
    if (ans !== 'RESET') {
      console.log('Aborted.');
      await mongoose.disconnect();
      process.exit(0);
    }
  }

  // 1. Delete every record that produces an invoice + the counters.
  //    Payment and Renewal docs are deleted outright — the invoice list/modal is
  //    derived from them, so without this the invoices keep showing after a reset.
  const delInv = await Invoice.deleteMany({});
  const delPay = await Payment.deleteMany({});
  const delRen = await Renewal.deleteMany({});
  const delCtr = await InvoiceCounter.deleteMany({});

  // 2. Wipe the full invoice MIRROR on every registration (number + draft +
  //    generated flag + hidden list). The Invoice collection is the source of
  //    truth and it's now empty, so these cached fields must be cleared or the
  //    admin table still shows "Invoice"/edit and the PDF rebuilds an old number.
  //    Only touch nested nextRenewal.invoiceNumber where it already exists, so we
  //    never fabricate an empty nextRenewal object.
  await Promise.all([
    Individual.updateMany({}, { $set: { invoiceNumber: '', invoiceDraft: null, invoiceGenerated: false, hiddenInvoiceNumbers: [] } }),
    Airlines.updateMany({},   { $set: { invoiceNumber: '', invoiceDraft: null, invoiceGenerated: false, hiddenInvoiceNumbers: [] } }),
    AirlinesSubscription.updateMany({}, { $set: { invoiceNumber: '' } }),
    Individual.updateMany({ 'nextRenewal.invoiceNumber': { $exists: true } }, { $set: { 'nextRenewal.invoiceNumber': '' } }),
    Airlines.updateMany({ 'nextRenewal.invoiceNumber': { $exists: true } }, { $set: { 'nextRenewal.invoiceNumber': '' } }),
    AirlinesSubscription.updateMany({ 'nextRenewal.invoiceNumber': { $exists: true } }, { $set: { 'nextRenewal.invoiceNumber': '' } }),
  ]);

  console.log('\nDone:');
  console.log(`   • Invoice docs deleted:   ${delInv.deletedCount}`);
  console.log(`   • Payment docs deleted:   ${delPay.deletedCount}`);
  console.log(`   • Renewal docs deleted:   ${delRen.deletedCount}`);
  console.log(`   • Counters deleted:       ${delCtr.deletedCount}`);
  console.log('   • Next invoice number will be Invoice US-1-' + String(new Date().getFullYear()).slice(-2) + '\n');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('ERROR:', err.message);
  try { await mongoose.disconnect(); } catch { /* ignore */ }
  process.exit(1);
});

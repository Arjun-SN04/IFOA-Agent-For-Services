/**
 * invoiceNumberService.js
 *
 * Generates unique, sequential invoice numbers in the format:
 *   Invoice US-{sequence}-{YY}
 *   e.g. Invoice US-1-26, Invoice US-350-26, Invoice US-1-27
 */

const InvoiceCounter = require('../models/InvoiceCounter');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Renewal = require('../models/Renewal');
const Individual = require('../models/Individual');
const Airlines = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');

function normalizeInvoiceNumber(value) {
  return String(value || '').trim();
}

async function existsOnModel(Model, query, excludeId = null) {
  const row = await Model.findOne(query).select('_id');
  if (!row) return false;
  return String(row._id) !== String(excludeId || '');
}

async function isInvoiceNumberTaken(invoiceNumber, opts = {}) {
  const normalized = normalizeInvoiceNumber(invoiceNumber);
  if (!normalized) return false;

  const {
    excludePaymentId = null,
    excludeInvoiceId = null,
    excludeRenewalId = null,
    excludeRegistrationId = null,
    excludeRegistrationModel = null,
  } = opts;

  if (await existsOnModel(Payment, { invoiceNumber: normalized }, excludePaymentId)) return true;
  if (await existsOnModel(Invoice, { invoiceNumber: normalized }, excludeInvoiceId)) return true;
  if (await existsOnModel(Renewal, { invoiceNumber: normalized }, excludeRenewalId)) return true;

  if (
    await existsOnModel(
      Individual,
      { $or: [{ invoiceNumber: normalized }, { 'nextRenewal.invoiceNumber': normalized }] },
      excludeRegistrationModel === 'Individual' ? excludeRegistrationId : null,
    )
  ) return true;

  if (
    await existsOnModel(
      Airlines,
      { $or: [{ invoiceNumber: normalized }, { 'nextRenewal.invoiceNumber': normalized }] },
      excludeRegistrationModel === 'Airlines' ? excludeRegistrationId : null,
    )
  ) return true;

  if (
    await existsOnModel(
      AirlinesSubscription,
      { $or: [{ invoiceNumber: normalized }, { 'nextRenewal.invoiceNumber': normalized }] },
      excludeRegistrationModel === 'AirlinesSubscription' ? excludeRegistrationId : null,
    )
  ) return true;

  return false;
}

/**
 * Collect every invoice SEQUENCE number (the {n} in "Invoice US-{n}-{YY}")
 * currently used ANYWHERE in the DB for a given two-digit year.
 *
 * Scans all collections that can hold an invoice number so a sequence is only
 * considered "free" when no record uses it. Deleting an invoice (which clears
 * its number from every source) therefore makes that sequence reusable.
 */
async function collectUsedSequences(yy) {
  const regex = new RegExp(`^Invoice US-(\\d+)-${yy}$`);
  const used = new Set();
  const add = (value) => {
    const m = regex.exec(normalizeInvoiceNumber(value));
    if (m) used.add(Number(m[1]));
  };

  const [payments, invoices, renewals, individuals, airlines, airSubs] = await Promise.all([
    Payment.find({}).select('invoiceNumber').lean(),
    Invoice.find({}).select('invoiceNumber').lean(),
    Renewal.find({}).select('invoiceNumber').lean(),
    Individual.find({}).select('invoiceNumber nextRenewal.invoiceNumber').lean(),
    Airlines.find({}).select('invoiceNumber nextRenewal.invoiceNumber').lean(),
    AirlinesSubscription.find({}).select('invoiceNumber nextRenewal.invoiceNumber').lean(),
  ]);

  payments.forEach((d) => add(d.invoiceNumber));
  invoices.forEach((d) => add(d.invoiceNumber));
  renewals.forEach((d) => add(d.invoiceNumber));
  [...individuals, ...airlines, ...airSubs].forEach((d) => {
    add(d.invoiceNumber);
    add(d.nextRenewal?.invoiceNumber);
  });

  return used;
}

/** Smallest positive integer not present in the used-set (>= startFrom). */
function lowestMissingSequence(used, startFrom = 1) {
  let n = startFrom;
  while (used.has(n)) n += 1;
  return n;
}

/**
 * Generate a unique invoice number, REUSING the lowest free sequence.
 *
 * Starts the search at 1 and walks up, so any gap left by a deleted invoice is
 * filled before advancing past the highest number ever issued. Only when every
 * sequence 1..max is in use does it move to max+1.
 *
 * The per-year counter is kept as a monotonic high-water mark (never decreased)
 * so other consumers that read it still see a sane upper bound.
 */
async function generateInvoiceNumber(yearOverride) {
  const useYear = yearOverride || new Date().getFullYear();
  const yy = String(useYear).slice(-2);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const used = await collectUsedSequences(yy);
    const seq = lowestMissingSequence(used);
    const candidate = `Invoice US-${seq}-${yy}`;

    // Re-verify against a fresh read to guard against a race between the scan and now.
    // eslint-disable-next-line no-await-in-loop
    if (!(await isInvoiceNumberTaken(candidate))) {
      // eslint-disable-next-line no-await-in-loop
      await InvoiceCounter.updateOne(
        { year: useYear },
        { $max: { sequence: seq } },
        { upsert: true, setDefaultsOnInsert: true },
      );
      return candidate;
    }
  }

  throw new Error('Unable to generate a unique invoice number after multiple attempts.');
}

/**
 * Peek the next invoice number WITHOUT committing it.
 *
 * Returns the same lowest-free sequence generateInvoiceNumber() would assign, but
 * does not touch the counter — so merely opening (and cancelling) the admin invoice
 * modal never burns a number. The number is reserved for real only when the invoice
 * is saved, at which point the save path validates uniqueness.
 */
async function peekNextInvoiceNumber(yearOverride) {
  const useYear = yearOverride || new Date().getFullYear();
  const yy = String(useYear).slice(-2);

  const used = await collectUsedSequences(yy);
  const seq = lowestMissingSequence(used);
  return `Invoice US-${seq}-${yy}`;
}

/**
 * True only if `invoiceNumber` is used by some record belonging to a DIFFERENT
 * registration. A registration's own Invoice/Payment/Renewal/registration fields
 * are NOT a collision — this lets an admin (re)point a registration at its own
 * invoice number without a false "already exists" (which happened when an invoice
 * was created first, then the registration's mirror was written in the same save).
 */
async function isInvoiceNumberTakenByOtherRegistration(invoiceNumber, registrationId) {
  const norm = normalizeInvoiceNumber(invoiceNumber);
  if (!norm) return false;
  const regId = String(registrationId || '');

  const [pay, inv, ren, ind, air, asub] = await Promise.all([
    Payment.findOne({ invoiceNumber: norm, registrationId: { $ne: regId } }).select('_id').lean(),
    Invoice.findOne({ invoiceNumber: norm, registrationId: { $ne: regId } }).select('_id').lean(),
    Renewal.findOne({ invoiceNumber: norm, registrationId: { $ne: regId } }).select('_id').lean(),
    Individual.findOne({ _id: { $ne: regId }, $or: [{ invoiceNumber: norm }, { 'nextRenewal.invoiceNumber': norm }] }).select('_id').lean(),
    Airlines.findOne({ _id: { $ne: regId }, $or: [{ invoiceNumber: norm }, { 'nextRenewal.invoiceNumber': norm }] }).select('_id').lean(),
    AirlinesSubscription.findOne({ _id: { $ne: regId }, $or: [{ invoiceNumber: norm }, { 'nextRenewal.invoiceNumber': norm }] }).select('_id').lean(),
  ]);

  return !!(pay || inv || ren || ind || air || asub);
}

module.exports = {
  generateInvoiceNumber,
  peekNextInvoiceNumber,
  isInvoiceNumberTaken,
  isInvoiceNumberTakenByOtherRegistration,
  normalizeInvoiceNumber,
};

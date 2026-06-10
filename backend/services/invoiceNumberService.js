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
 * Atomically increment the counter and return a unique invoice number.
 * We still verify DB-wide uniqueness before returning for extra safety.
 */
async function generateInvoiceNumber(yearOverride) {
  const useYear = yearOverride || new Date().getFullYear();
  const yy = String(useYear).slice(-2);

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const counter = await InvoiceCounter.findOneAndUpdate(
      { year: useYear },
      { $inc: { sequence: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const candidate = `Invoice US-${counter.sequence}-${yy}`;
    const taken = await isInvoiceNumberTaken(candidate);
    if (!taken) return candidate;
  }

  throw new Error('Unable to generate a unique invoice number after multiple attempts.');
}

/**
 * Peek the next invoice number WITHOUT incrementing the persisted counter.
 *
 * Used by the admin invoice modal on open so merely viewing (and then cancelling)
 * never burns a sequence number — that left permanent gaps in the invoice numbering.
 * The number is reserved for real only when the invoice is saved, at which point
 * the save path validates uniqueness (isInvoiceNumberTaken) and the payment flow's
 * generateInvoiceNumber() advances/skips as needed.
 */
async function peekNextInvoiceNumber(yearOverride) {
  const useYear = yearOverride || new Date().getFullYear();
  const yy = String(useYear).slice(-2);

  const counter = await InvoiceCounter.findOne({ year: useYear }).select('sequence').lean();
  let next = (counter?.sequence || 0) + 1;

  // Skip any candidate already used anywhere in the DB (manual admin invoices may
  // have consumed numbers without advancing the counter).
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = `Invoice US-${next}-${yy}`;
    // eslint-disable-next-line no-await-in-loop
    if (!(await isInvoiceNumberTaken(candidate))) return candidate;
    next += 1;
  }
  throw new Error('Unable to peek a free invoice number after multiple attempts.');
}

module.exports = { generateInvoiceNumber, peekNextInvoiceNumber, isInvoiceNumberTaken, normalizeInvoiceNumber };

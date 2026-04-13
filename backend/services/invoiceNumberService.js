/**
 * invoiceNumberService.js
 *
 * Generates unique, sequential invoice numbers in the format:
 *   Invoice US-{sequence}-{YY}
 *   e.g.  Invoice US-1-26,  Invoice US-350-26,  Invoice US-1-27
 *
 * - "US" is mandatory and always present.
 * - {sequence} increments per calendar year (resets to 1 each January 1st).
 * - {YY} is the last two digits of the current year.
 * - Uses findOneAndUpdate with $inc + upsert — fully race-condition-safe.
 */

const InvoiceCounter = require('../models/InvoiceCounter');

/**
 * Atomically increment the counter for the current year and return
 * a unique invoice number string.
 *
 * @param {number} [yearOverride]  — override year (for tests only)
 * @returns {Promise<string>}  e.g. "Invoice US-42-26"
 */
async function generateInvoiceNumber(yearOverride) {
  const useYear = yearOverride || new Date().getFullYear();
  const yy      = String(useYear).slice(-2); // "2026" → "26"

  const counter = await InvoiceCounter.findOneAndUpdate(
    { year: useYear },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return `Invoice US-${counter.sequence}-${yy}`;
}

module.exports = { generateInvoiceNumber };

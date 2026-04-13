/**
 * InvoiceCounter.js
 *
 * Stores a per-year auto-incrementing sequence used to generate
 * unique invoice numbers.
 *
 * Format: Invoice US-{sequence}-{YY}   e.g.  Invoice US-350-26
 *
 * One document per calendar year; sequence resets to 1 each new year.
 */
const mongoose = require('mongoose');

const InvoiceCounterSchema = new mongoose.Schema({
  year:     { type: Number, required: true, unique: true, index: true },
  sequence: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('InvoiceCounter', InvoiceCounterSchema);

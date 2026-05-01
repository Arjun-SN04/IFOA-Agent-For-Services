const mongoose = require('mongoose');

/**
 * Renewal — one document per renewal payment made by a subscriber.
 *
 * Keeps a clean, immutable record of each renewal that is separate from
 * the live Individual / Airlines subscription fields.  The subscription
 * stores nextRenewalId (ref to this model) when a queued renewal is
 * waiting to activate.  Once activated, status changes to 'active' and
 * the subscription fields are updated from the data here.
 *
 * We intentionally do NOT overwrite Individual.expirationDate until the
 * renewal is activated — so the user's current plan always reflects what
 * is live today.
 */
const RenewalSchema = new mongoose.Schema({
  // ── Linked registration ─────────────────────────────────────────────────────
  registrationId:    { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  registrationModel: { type: String, enum: ['Individual', 'Airlines'], required: true },

  // ── Linked payment ──────────────────────────────────────────────────────────
  paymentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', index: true },
  invoiceNumber: { type: String, default: '' },

  // ── What was purchased ──────────────────────────────────────────────────────
  plan:           { type: String, required: true },
  multiYearCount: { type: Number, default: null },  // years for Multi-Year plan
  committedCount: { type: Number, default: null },  // airline: holder count at renewal time
  price:          { type: Number, required: true },  // amount actually paid

  // ── When & period ───────────────────────────────────────────────────────────
  paidAt:         { type: Date, required: true },
  // activationDate = the current subscription's expirationDate at time of payment.
  // For an immediately-activated renewal (expired plan), activationDate == paidAt.
  activationDate: { type: Date, required: true },
  // expiresAt = activationDate + plan years (null for Unlimited Plan)
  expiresAt:      { type: Date, default: null },

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: [
      'queued',      // paid, waiting for current plan to expire
      'active',      // current plan period is live (activated by admin or auto)
      'superseded',  // replaced by a newer renewal before it ever activated
    ],
    default: 'queued',
    index: true,
  },

  // Set when admin force-activates via POST /api/payments/admin/activate-renewal
  activatedAt:   { type: Date, default: null },
  activatedByAdmin: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model('Renewal', RenewalSchema);

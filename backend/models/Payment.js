const mongoose = require('mongoose');

/**
 * Payment model — one document per successful (or attempted) Stripe payment.
 *
 * SINGLE SOURCE OF TRUTH FOR INVOICES
 * ─────────────────────────────────────
 * invoiceSnapshot  — immutable snapshot captured at payment time (never changes)
 * invoiceDraft     — admin-editable invoice fields (saved via PATCH /:id/save-invoice-draft)
 *
 * Both the admin dashboard and the user-facing subscription page read from
 * this same document, so everyone always sees an identical invoice.
 */
const PaymentSchema = new mongoose.Schema({

  // ── Stripe fields ──────────────────────────────────────────────────────────
  stripePaymentIntentId: { type: String, required: true, unique: true, index: true },
  stripeChargeId:        { type: String, default: '' },
  stripeCustomerId:      { type: String, default: '' },
  paymentMethodType:     { type: String, default: '' },
  last4:                 { type: String, default: '' },
  cardBrand:             { type: String, default: '' },

  // ── Status ─────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
    index: true,
  },
  isPaid: { type: Boolean, default: false, index: true },
  paidAt: { type: Date },

  // ── Amount ────────────────────────────────────────────────────────────────
  amountCents:    { type: Number, required: true },
  amountDollars:  { type: Number, required: true },
  currency:       { type: String, default: 'usd' },
  refundedCents:  { type: Number, default: 0 },

  // ── Linked registration ────────────────────────────────────────────────────
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  registrationModel: {
    type: String,
    enum: ['Individual', 'Airlines', 'AirlinesSubscription'],
    required: true,
  },

  // ── Invoice snapshot (immutable — captured at payment time) ───────────────
  invoiceNumber:    { type: String, required: true, unique: true, index: true },
  invoiceSnapshot: {
    name:             { type: String, default: '' },
    email:            { type: String, default: '' },
    phone:            { type: String, default: '' },
    address:          { type: String, default: '' },
    isAirline:        { type: Boolean, default: false },
    airlineName:      { type: String, default: '' },

    subscriptionPlan:  { type: String, default: '' },
    multiYearCount:    { type: Number, default: null },  // Individual + Airline multi-year year count
    subscriptionDate:  { type: Date },
    expirationDate:    { type: Date },

    primaryCertificate:    { type: String, default: '' },
    faaCertificateNumber:  { type: String, default: '' },
    iacraTrackingNumber:   { type: String, default: '' },

    holderCount:   { type: Number, default: 0 },
    pricePerCert:  { type: Number, default: 0 },

    subtotal:   { type: Number, default: 0 },
    tax:        { type: Number, default: 0 },
    totalPaid:  { type: Number, default: 0 },
  },

  // ── Admin-editable invoice draft (single source of truth for PDF) ─────────
  // Saved by admin via PATCH /api/payments/:id/save-invoice-draft.
  // When present, both the admin dashboard AND the user subscription page
  // use this draft to generate the PDF — same invoice, same data, always.
  // Schema mirrors the shape expected by generateIFOAInvoicePDF().
  invoiceDraft: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // ── Payment purpose ─────────────────────────────────────────────────────────
  // 'payment'        — initial subscription payment
  // 'renewal'        — renewal of an existing subscription
  // 'holder-upgrade' — airline adds more certificate holder slots
  purpose: {
    type: String,
    enum: ['payment', 'renewal', 'holder-upgrade'],
    default: 'payment',
    index: true,
  },

  // ── Renewal metadata — persisted so applyRenewalToRegistration can read them ─
  newSubscriptionPlan:   { type: String, default: null },  // plan user chose at renewal time
  renewalMultiYearCount: { type: Number, default: null },  // years for multi-year renewal
  renewalExactCount:     { type: Number, default: null },  // holder count for airline renewal
  renewalHoldersToRemove: { type: [String], default: null }, // holder _ids to remove on activation

  // ── Metadata / misc ────────────────────────────────────────────────────────
  description:  { type: String, default: '' },
  notes:        { type: String, default: '' },
  ipAddress:    { type: String, default: '' },
  userAgent:    { type: String, default: '' },

  confirmedVia: {
    type: String,
    enum: ['webhook', 'frontend', 'manual'],
    default: 'frontend',
  },

}, { timestamps: true });

PaymentSchema.virtual('formattedAmount').get(function () {
  return `$${this.amountDollars.toFixed(2)} ${this.currency.toUpperCase()}`;
});

module.exports = mongoose.model('Payment', PaymentSchema);

const mongoose = require('mongoose');

/**
 * Payment model — one document per successful (or attempted) Stripe payment.
 * Stores everything needed to regenerate an invoice at any time without
 * touching the registration records.
 */
const PaymentSchema = new mongoose.Schema({

  // ── Stripe fields ──────────────────────────────────────────────────────────
  stripePaymentIntentId: { type: String, required: true, unique: true, index: true },
  stripeChargeId:        { type: String, default: '' },
  stripeCustomerId:      { type: String, default: '' },
  paymentMethodType:     { type: String, default: '' }, // 'card', 'link', 'us_bank_account', etc.
  last4:                 { type: String, default: '' }, // last 4 digits of card (if card)
  cardBrand:             { type: String, default: '' }, // 'visa', 'mastercard', etc.

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
  amountCents:    { type: Number, required: true },  // e.g. 6900
  amountDollars:  { type: Number, required: true },  // e.g. 69.00
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

  // ── Invoice data (snapshot at time of payment — never changes) ─────────────
  invoiceNumber:    { type: String, required: true, index: true },
  invoiceSnapshot: {
    // Subscriber identity
    name:             { type: String, default: '' },
    email:            { type: String, default: '' },
    phone:            { type: String, default: '' },
    address:          { type: String, default: '' },
    isAirline:        { type: Boolean, default: false },
    airlineName:      { type: String, default: '' },

    // Plan details
    subscriptionPlan: { type: String, default: '' },
    subscriptionDate: { type: Date },
    expirationDate:   { type: Date },

    // Cert details (individual)
    primaryCertificate:    { type: String, default: '' },
    faaCertificateNumber:  { type: String, default: '' },
    iacraTrackingNumber:   { type: String, default: '' },

    // Airline-specific
    holderCount:   { type: Number, default: 0 },
    pricePerCert:  { type: Number, default: 0 },

    // Amounts
    subtotal:   { type: Number, default: 0 },
    tax:        { type: Number, default: 0 },
    totalPaid:  { type: Number, default: 0 },
  },

  // ── Metadata / misc ────────────────────────────────────────────────────────
  description:  { type: String, default: '' },
  notes:        { type: String, default: '' },
  ipAddress:    { type: String, default: '' },
  userAgent:    { type: String, default: '' },

  // Webhook vs direct confirm
  confirmedVia: {
    type: String,
    enum: ['webhook', 'frontend', 'manual'],
    default: 'frontend',
  },

}, { timestamps: true });

// ── Virtual: formatted invoice number ────────────────────────────────────────
PaymentSchema.virtual('formattedAmount').get(function () {
  return `$${this.amountDollars.toFixed(2)} ${this.currency.toUpperCase()}`;
});

module.exports = mongoose.model('Payment', PaymentSchema);

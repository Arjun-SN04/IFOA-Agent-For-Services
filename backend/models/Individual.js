const mongoose = require('mongoose');

const IndividualSchema = new mongoose.Schema({
  // Status & Subscription Information
  status: { type: String, enum: ['Active', 'Inactive', 'Pending'], default: 'Pending' },
  // Soft-cancel: individual requested cancellation; awaits admin decision (keep / edit
  // / hard-delete). Plan data is retained until the admin acts.
  planCancelled:   { type: Boolean, default: false },
  planCancelledAt: { type: Date,    default: null },
  subscriptionPlan: {
    type: String,
    enum: [
      '1 Year Subscription Plan',
      'Multiple Years Subscription Plan',
      'Unlimited Plan',
    ],
    required: true,
  },
  price: { type: Number, default: 69.00 },
  subscriptionDate: { type: Date },
  expirationDate: { type: Date },
  totalServiceFees: { type: Number },

  // Step 1 - Personal Info
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  middleName: { type: String },
  dateOfBirth: { type: Date, default: null },

  // Address
  addressLine1: { type: String },
  city: { type: String },
  state: { type: String }, // State/Province
  postalCode: { type: String },
  country: { type: String },

  phone: { type: String },
  email: { type: String, required: true, lowercase: true, trim: true },

  // Step 2 - Certificates
  primaryAirmanCertificate: {
    type: String,
    enum: ['NEW', 'EXISTING'],
    required: true,
  },
  primaryCertificate: {
    type: String,
    enum: ['Part 65 - Aircraft Dispatcher', 'Part 61 - Pilot', 'Part 61 - Flight or Ground Instructor', 'Part 107 - Remote Pilot'],
    required: true,
  },
  faaCertificateNumber: { type: String },
  iacraTrackingNumber: { type: String },
  hasSecondaryCertificate: { type: Boolean, default: false },
  secondaryCertificate: { type: String },
  secondaryFaaCertificateNumber: { type: String },
  secondaryIacraTrackingNumber: { type: String },

  // Multi-year count — used when plan is "Multiple Years Subscription Plan"
  // Default 3; admin can override to any integer > 1.
  multiYearCount: { type: Number, default: 3 },

  // Payment & Invoice
  paymentEmail: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  // True only after payment is completed (card confirm or wire marked paid).
  isFormCompleted: { type: Boolean, default: false, index: true },
  isPaid:        { type: Boolean, default: false, index: true },
  paymentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  invoiceStatus: { type: String },
  invoiceNumber: { type: String },
  invoiceDraft:  { type: mongoose.Schema.Types.Mixed, default: null },
  // Invoice numbers admin has deleted/hidden — filtered out of the invoice list
  // shown to the individual (and admin) so a deleted invoice never reappears.
  hiddenInvoiceNumbers: { type: [String], default: [] },
  stripePaymentIntentId: { type: String, default: '' },

  // Invoice generation tracking — set to true by admin after first PDF download
  invoiceGenerated: { type: Boolean, default: false, index: true },

  // Last renewal snapshot — populated by paymentController after each renewal payment
  lastRenewal: {
    plan:           { type: String },
    multiYearCount: { type: Number },
    committedCount: { type: Number, default: null }, // (airline) holder count at renewal time
    paidAt:         { type: Date },
    activationDate: { type: Date },   // start of the renewed period (= old expirationDate)
    expiresAt:      { type: Date },   // new expiration date after renewal
    price:          { type: Number },
    invoiceNumber:  { type: String },
  },

  // Reference to the active Renewal doc (set when user pays for renewal).
  // Cleared when the renewal is activated or superseded.
  nextRenewalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Renewal', default: null },

  // Next / queued renewal — set when user pays for renewal BEFORE current plan expires.
  // The plan is NOT yet active; it activates automatically when activationDate is reached.
  // Cleared once activated (or admin can clear manually).
  nextRenewal: {
    plan:           { type: String },
    multiYearCount: { type: Number },
    committedCount: { type: Number, default: null }, // (airline) holder count at renewal time
    paidAt:         { type: Date },   // when payment was made
    activationDate: { type: Date },   // = current expirationDate at time of payment
    expiresAt:      { type: Date },   // activationDate + plan years
    price:          { type: Number },
    invoiceNumber:  { type: String },
  },

  // Set when an airline converts a certificate holder to an individual account.
  convertedFromAirlineId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Airlines', default: null },
  convertedFromAirlineName: { type: String, default: '' },

  agreedToTerms: { type: Boolean, required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Individual', IndividualSchema);


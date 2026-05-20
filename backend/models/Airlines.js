const mongoose = require('mongoose');

const CertificateHolderSchema = new mongoose.Schema({
  fullName:                     { type: String, required: true, trim: true },
  // Keep optional for backward compatibility with legacy/admin Excel airline sheets
  // where team-member DOB is not present as a dedicated column.
  dateOfBirth:                  { type: Date, required: false, default: null },
  certificateType: {
    type: String,
    required: true,
    enum: ['Part 61 - Pilot', 'Part 61 - Flight or Ground Instructor', 'Part 65 - Aircraft Dispatcher'],
  },
  certificateStatus:            { type: String, enum: ['NEW', 'EXISTING'], required: true },
  faaCertificateNumber:         { type: String, default: '' },
  iacraFtnNumber:               { type: String, required: true },
  email:                        { type: String, default: '' },
  hasSecondaryCertificate:      { type: Boolean, default: false },
  secondaryCertificateType:     { type: String, default: '' },
  secondaryFaaCertificateNumber:{ type: String, default: '' },
  secondaryIacraFtnNumber:      { type: String, default: '' },
});

const AirlinesSchema = new mongoose.Schema({
  // Status (managed by admin)
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending'],
    default: 'Pending',
  },

  // Plan
  subscriptionPlan: {
    type: String,
    enum: ['1 Year Subscription Plan', 'Multiple Years Subscription Plan', 'Unlimited Plan'],
    required: true,
  },
  holderCount:      { type: String }, // e.g. "3 to 5"
  holderCountValue: { type: String }, // e.g. "4"
  pricePerCertificate: { type: Number, required: true },
  totalAmount:         { type: Number },
  subscriptionDate:    { type: Date },
  expirationDate:      { type: Date },
  totalServiceFees:    { type: Number },
  // Number of years for Multiple Years plan (min 2) — mirrors Individual.multiYearCount
  multiYearCount:      { type: Number, default: null },

  // Airline / Operator info
  airlineName: { type: String, required: true, trim: true },

  // Primary contact
  firstName:   { type: String, required: true },
  lastName:    { type: String, required: true },
  middleName:  { type: String, default: '' },
  dateOfBirth: { type: Date },
  email:       { type: String, required: true },
  phone:       { type: String, required: true },

  // Point of Contact (optional — for extra contact person if different from above)
  pointOfContact:      { type: String },
  pointOfContactEmail: { type: String },
  pointOfContactPhone: { type: String },

  // Address
  addressLine1: { type: String },
  addressLine2: { type: String },
  city:         { type: String },
  state:        { type: String },
  postalCode:   { type: String },
  country:      { type: String },

  // Certificate holders (array)
  certificateHolders: { type: [CertificateHolderSchema], default: [] },

  // committedCount = exact number selected in Step 1 (holderCountValue)
  // This is the "slots" the airline committed to and will be billed for
  committedCount: { type: Number, default: 0 },

  // amountPaid tracks cumulative payments made so far
  amountPaid: { type: Number, default: 0 },

  // Payment
  paymentEmail: { type: String, default: '' },
  wirePaymentRequested: { type: Boolean, default: false, index: true },
  wirePaymentRequestedAt: { type: Date, default: null },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  // True only after payment is completed (card confirm or wire marked paid).
  isFormCompleted: { type: Boolean, default: false, index: true },
  isPaid:        { type: Boolean, default: false, index: true },  // true only after Payment record confirmed
  paymentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }, // link to Payment doc
  invoiceStatus: { type: String },
  invoiceNumber: { type: String },
  invoiceDraft:  { type: mongoose.Schema.Types.Mixed, default: null },
  stripePaymentIntentId: { type: String, default: '' },

  // Invoice generation tracking — set to true by admin after first PDF download
  invoiceGenerated: { type: Boolean, default: false, index: true },

  // Last renewal snapshot — populated by paymentController after each renewal payment
  lastRenewal: {
    plan:           { type: String },
    multiYearCount: { type: Number },
    committedCount: { type: Number, default: null }, // holder count at renewal time
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
    plan:             { type: String },
    multiYearCount:   { type: Number },
    committedCount:   { type: Number, default: null }, // holder count user selected at renewal time
    holdersToRemove:  { type: [String], default: null }, // holder _ids to remove on activation
    paidAt:           { type: Date },   // when payment was made
    activationDate:   { type: Date },   // = current expirationDate at time of payment
    expiresAt:        { type: Date },   // activationDate + plan years
    price:            { type: Number },
    invoiceNumber:    { type: String },
  },

  // Invoice request tracking — set to true when airline user requests an invoice
  invoiceRequested:    { type: Boolean, default: false, index: true },
  invoiceRequestedAt:  { type: Date, default: null },

  agreedToTerms: { type: Boolean, required: true },
  submittedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-compute totalAmount before save.
// For Multiple Years plans: pricePerCert × count × years.
// For all other plans (1 Year, Unlimited): pricePerCert × count.
AirlinesSchema.pre('save', function (next) {
  const count = this.committedCount || this.certificateHolders?.length || 1;
  if (
    this.subscriptionPlan === 'Multiple Years Subscription Plan' &&
    this.multiYearCount > 1
  ) {
    this.totalAmount = this.pricePerCertificate * count * Number(this.multiYearCount);
  } else {
    this.totalAmount = this.pricePerCertificate * count;
  }
  next();
});

module.exports = mongoose.model('Airlines', AirlinesSchema);

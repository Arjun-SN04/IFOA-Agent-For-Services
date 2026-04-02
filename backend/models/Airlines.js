const mongoose = require('mongoose');

const CertificateHolderSchema = new mongoose.Schema({
  fullName:                     { type: String, required: true, trim: true },
  dateOfBirth:                  { type: Date, required: true },
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
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  isPaid:        { type: Boolean, default: false, index: true },  // true only after Payment record confirmed
  paymentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }, // link to Payment doc
  invoiceStatus: { type: String },
  invoiceNumber: { type: String },
  stripePaymentIntentId: { type: String, default: '' },

  agreedToTerms: { type: Boolean, required: true },
  submittedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-compute totalAmount before save.
// Uses committedCount (the declared seat count) NOT current holders length,
// so partial submissions don't shrink the invoice.
AirlinesSchema.pre('save', function (next) {
  const isUnlimited = this.subscriptionPlan === 'Unlimited Plan';
  if (isUnlimited) {
    this.totalAmount = this.pricePerCertificate;
  } else {
    // committedCount set by controller on create; fall back to actual holders
    const count = this.committedCount || this.certificateHolders?.length || 1;
    this.totalAmount = this.pricePerCertificate * count;
  }
  next();
});

module.exports = mongoose.model('Airlines', AirlinesSchema);

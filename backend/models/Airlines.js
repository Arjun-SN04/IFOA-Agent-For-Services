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

  // Payment
  paymentEmail: { type: String, default: '' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },
  invoiceStatus: { type: String },
  invoiceNumber: { type: String },

  agreedToTerms: { type: Boolean, required: true },
  submittedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-compute totalAmount before save
AirlinesSchema.pre('save', function (next) {
  const isUnlimited = this.subscriptionPlan === 'Unlimited Plan';
  this.totalAmount = isUnlimited
    ? this.pricePerCertificate
    : this.pricePerCertificate * (this.certificateHolders?.length || 1);
  next();
});

module.exports = mongoose.model('Airlines', AirlinesSchema);

const mongoose = require('mongoose');

const IndividualSchema = new mongoose.Schema({
  // Status & Subscription Information
  status: { type: String, enum: ['Active', 'Inactive', 'Pending'], default: 'Pending' },
  subscriptionPlan: {
    type: String,
    enum: ['1 Year Subscription Plan', 'Multiple Years Subscription Plan', 'Unlimited Plan'],
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
  dateOfBirth: { type: Date, required: true },

  // Address
  addressLine1: { type: String },
  city: { type: String },
  state: { type: String }, // State/Province
  postalCode: { type: String },
  country: { type: String },

  phone: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true },

  // Step 2 - Certificates
  primaryAirmanCertificate: {
    type: String,
    enum: ['NEW', 'EXISTING'],
    required: true,
  },
  primaryCertificate: {
    type: String,
    enum: ['Part 65 - Aircraft Dispatcher', 'Part 61 - Pilot', 'Part 61 - Flight or Ground Instructor'],
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
  isPaid:        { type: Boolean, default: false, index: true },
  paymentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  invoiceStatus: { type: String },
  invoiceNumber: { type: String },
  stripePaymentIntentId: { type: String, default: '' },

  agreedToTerms: { type: Boolean, required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Individual', IndividualSchema);

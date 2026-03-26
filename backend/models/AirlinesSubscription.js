const mongoose = require('mongoose');

// ── Certificate Holder sub-schema ──
const CertificateHolderSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  dateOfBirth: { type: Date, required: true },
  certificateType: {
    type: String,
    required: true,
    enum: ['Part 61 - Pilot', 'Part 61 - Flight or Ground Instructor', 'Part 65 - Aircraft Dispatcher'],
  },
  certificateStatus: { type: String, enum: ['NEW', 'EXISTING'], required: true },
  faaCertificateNumber: { type: String, default: '' },
  iacraFtnNumber: { type: String, required: true, trim: true },
  hasSecondary: { type: Boolean, default: false },
  secondaryCertificateType: { type: String, default: '' },
  secondaryFaaCertificateNumber: { type: String, default: '' },
  secondaryIacraFtnNumber: { type: String, default: '' },
});

const AirlinesSubscriptionSchema = new mongoose.Schema({
  // Plan
  subscriptionPlan: {
    type: String,
    enum: ['1 Year Subscription Plan', 'Multiple Years Subscription Plan', 'Unlimited Plan'],
    required: true,
  },
  pricePerCert: { type: Number, required: true },
  totalAmount: { type: Number, default: 0 },

  // Airline info
  airlineName: { type: String, required: true, trim: true },
  contactFirstName: { type: String, required: true, trim: true },
  contactLastName: { type: String, required: true, trim: true },
  contactEmail: { type: String, required: true, lowercase: true, trim: true },
  contactPhone: { type: String, required: true },

  // Address
  addressLine1: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  country: { type: String, required: true },

  // Certificate holders
  certificateHolders: {
    type: [CertificateHolderSchema],
    validate: {
      validator: (arr) => arr.length >= 1,
      message: 'At least one certificate holder is required',
    },
  },

  // Payment
  paymentEmail: { type: String, default: '' },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending',
  },

  agreedToTerms: { type: Boolean, required: true },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-compute totalAmount before save.
// Unlimited Plan is a flat annual fee — total = pricePerCert (not multiplied by holder count).
// All other plans charge per certificate — total = pricePerCert × holderCount.
AirlinesSubscriptionSchema.pre('save', function (next) {
  if (this.subscriptionPlan === 'Unlimited Plan') {
    this.totalAmount = this.pricePerCert || 0;
  } else {
    this.totalAmount = (this.pricePerCert || 0) * (this.certificateHolders?.length || 0);
  }
  next();
});

module.exports = mongoose.model('AirlinesSubscription', AirlinesSubscriptionSchema);

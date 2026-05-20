const mongoose = require('mongoose');

const HolderEventSchema = new mongoose.Schema({
  // 'holder-removed'  — airline removed a holder (admin must contact user)
  // 'holder-converted' — holder was converted directly to an Individual account
  type: {
    type: String,
    enum: ['holder-removed', 'holder-converted'],
    required: true,
  },

  // Source airline
  airlineId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Airlines', required: true },
  airlineName: { type: String, default: '' },

  // Holder snapshot at time of action
  holderName:     { type: String, default: '' },
  holderEmail:    { type: String, default: '' },
  holderSnapshot: { type: mongoose.Schema.Types.Mixed, default: null }, // full CertificateHolder subdoc

  // Only set for 'holder-converted' events
  convertedIndividualId: { type: mongoose.Schema.Types.ObjectId, ref: 'Individual', default: null },

  // Only relevant for 'holder-removed' — tracks whether admin has followed up
  // 'pending-contact' → admin needs to contact holder
  // 'converted'       → admin manually converted holder to individual after contact
  // 'dismissed'       → admin dismissed (user did not want to continue)
  status: {
    type: String,
    enum: ['pending-contact', 'converted', 'dismissed'],
    default: 'pending-contact',
  },

  // Who performed the action
  performedBy: { type: String, enum: ['airline', 'admin'], default: 'airline' },

  adminNotes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('HolderEvent', HolderEventSchema);

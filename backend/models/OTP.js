'use strict';

const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  email:    { type: String, required: true, lowercase: true, trim: true },
  code:     { type: String, required: true },
  purpose:  { type: String, required: true, enum: ['signup', 'password-reset', 'secondary-email', 'credential-change'] },
  expiresAt:{ type: Date,   required: true },
  used:     { type: Boolean, default: false },
}, { timestamps: true });

// MongoDB TTL index — auto-removes expired docs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', OTPSchema);

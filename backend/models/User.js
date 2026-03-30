const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'airline', 'individual'], required: true },
  firstName: { type: String },
  lastName: { type: String },
  // Reference to their registration record (for airline/individual)
  registrationId: { type: mongoose.Schema.Types.ObjectId, refPath: 'registrationModel' },
  registrationModel: { type: String, enum: ['Individual', 'AirlinesSubscription', 'Airlines'] },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', UserSchema);

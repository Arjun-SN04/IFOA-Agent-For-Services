const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'airline', 'individual'], required: true },
  firstName: { type: String },
  lastName: { type: String },
  // Airline name — only used when role === 'airline'. Pre-fills & locks the form.
  airlineName: { type: String, default: '' },
  // When true the user was created by admin and must change their password on first login.
  // Cleared to false after they successfully set a new password via update-credentials.
  mustChangePassword: { type: Boolean, default: false },
  // Reference to their primary registration record (for airline/individual)
  registrationId: { type: mongoose.Schema.Types.ObjectId, refPath: 'registrationModel' },
  // No built-in enum — custom validator allows null (admin/new users have no registration).
  registrationModel: {
    type: String,
    default: null,
    validate: {
      validator: function(v) { return v == null || ['Individual', 'AirlinesSubscription', 'Airlines'].includes(v); },
      message:   props => `\`${props.value}\` is not a valid registrationModel`,
    },
  },
  // All subscription IDs ever created by this account (airlines can have multiple)
  subscriptionIds: [{ type: mongoose.Schema.Types.ObjectId }],
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

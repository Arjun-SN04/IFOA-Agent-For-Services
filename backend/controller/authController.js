const mongoose = require('mongoose');
const User = require('../models/User');
const Individual = require('../models/Individual');
const Airlines = require('../models/Airlines');
const OTP  = require('../models/OTP');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendOtpEmail } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required — set it in .env');
const JWT_EXPIRES = '7d';

// Dummy hash used to equalise timing when user is not found (prevents enumeration)
const DUMMY_HASH = '$2a$12$invalidhashfortimingnormalization0000000000000000000000';

// mustChangePassword is embedded in the token so the middleware can enforce it
// without a DB lookup on every request.
const signToken = (user) =>
  jwt.sign(
    {
      id:                 user._id,
      email:              user.email,
      role:               user.role,
      mustChangePassword: user.mustChangePassword || false,
      // Include ownership fields so requireOwnership middleware can verify
      // record access without a DB lookup on every request.
      registrationId:     user.registrationId ? String(user.registrationId) : null,
      subscriptionIds:    (user.subscriptionIds || []).map(id => String(id)),
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES, algorithm: 'HS256' },
  );

// Helper: build the public user object returned in every auth response
function publicUser(user) {
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    airlineName: user.airlineName || '',
    registrationId: user.registrationId,
    subscriptionIds: user.subscriptionIds || [],
    mustChangePassword: user.mustChangePassword || false,
    secondaryEmails: user.secondaryEmails || [],
  };
}

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, airlineName } = req.body;
    if (!email || !password || !role)
      return res.status(400).json({ message: 'Email, password and role are required.' });
    if (role === 'admin')
      return res.status(403).json({ message: 'Admin accounts cannot be self-registered.' });
    if (role === 'airline' && !airlineName?.trim())
      return res.status(400).json({ message: 'Airline name is required for airline accounts.' });
    const normalAdminEmail = email.toLowerCase();
    const existing = await User.findOne({ $or: [{ email: normalAdminEmail }, { secondaryEmails: normalAdminEmail }] });
    if (existing)
      return res.status(409).json({ message: 'This email is already associated with an account.' });
    const user = await User.create({
      email, password, role, firstName, lastName,
      airlineName: role === 'airline' ? airlineName.trim() : '',
    });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });
    const normalEmail = email.toLowerCase();
    let user = await User.findOne({ email: normalEmail });
    // If not found as primary email, check secondary emails (airline login aliases)
    if (!user) user = await User.findOne({ secondaryEmails: normalEmail });
    // Always run bcrypt regardless of whether the user exists — prevents
    // timing-based user enumeration attacks.
    const valid = user
      ? await user.comparePassword(password)
      : await bcrypt.compare(password, DUMMY_HASH);
    if (!user || !valid) return res.status(401).json({ message: 'Invalid email or password.' });
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// GET /api/auth/me  (protected)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/auth/seed-admin-signup
// Open admin signup — reachable only by directly visiting /seed-admin-signup
// (the URL is not linked from the login page). No seed secret, no one-admin cap.
exports.seedAdminSignup = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const normalEmail = email.toLowerCase();
    const existing = await User.findOne({ $or: [{ email: normalEmail }, { secondaryEmails: normalEmail }] });
    if (existing)
      return res.status(409).json({ message: 'This email is already associated with an account.' });

    const admin = await User.create({
      email: normalEmail,
      password,
      role: 'admin',
      firstName: firstName || 'IFOA',
      lastName: lastName || 'Admin',
    });

    const token = signToken(admin);
    res.status(201).json({
      message: 'Admin account created successfully.',
      token,
      user: { id: admin._id, email: admin.email, role: admin.role, firstName: admin.firstName, lastName: admin.lastName },
    });
  } catch (err) {
    console.error('Seed admin signup error:', err);
    res.status(500).json({ message: 'Server error during admin signup.' });
  }
};

// POST /api/auth/seed-admin-login
exports.seedAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.role !== 'admin')
      return res.status(401).json({ message: 'Invalid credentials or not an admin account.' });

    const valid = await user.comparePassword(password);
    if (!valid)
      return res.status(401).json({ message: 'Invalid credentials or not an admin account.' });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
    });
  } catch (err) {
    console.error('Seed admin login error:', err);
    res.status(500).json({ message: 'Server error during admin login.' });
  }
};

// PUT /api/auth/update-credentials  (protected)
exports.updateCredentials = async (req, res) => {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;
    if (!currentPassword)
      return res.status(400).json({ message: 'Current password is required to make changes.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    if (!newEmail && !newPassword)
      return res.status(400).json({ message: 'Provide a new email or new password to update.' });

    const updateFields = {};

    if (newEmail && newEmail.toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: newEmail.toLowerCase() });
      if (exists) return res.status(409).json({ message: 'This email is already in use.' });
      updateFields.email = newEmail.toLowerCase();
    }

    if (newPassword) {
      if (newPassword.length < 8)
        return res.status(400).json({ message: 'New password must be at least 8 characters.' });
      updateFields.password = await bcrypt.hash(newPassword, 12);
      updateFields.mustChangePassword = false;
    }

    // Use findByIdAndUpdate so only the changed fields are validated —
    // avoids triggering enum errors on unrelated null fields (e.g. registrationModel).
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateFields },
      { new: true, runValidators: false },
    );

    const token = signToken(updatedUser);
    res.json({ message: 'Credentials updated successfully.', token, user: publicUser(updatedUser) });
  } catch (err) {
    console.error('Update credentials error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/auth/update-profile  (protected)
// Body: { firstName, lastName }
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    if (!firstName && !lastName)
      return res.status(400).json({ message: 'Provide at least a first name or last name to update.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const profileFields = {};
    if (firstName !== undefined) profileFields.firstName = firstName.trim();
    if (lastName  !== undefined) profileFields.lastName  = lastName.trim();

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: profileFields },
      { new: true, runValidators: false },
    );

    const token = signToken(updatedUser);
    res.json({ message: 'Profile updated successfully.', token, user: publicUser(updatedUser) });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/auth/update-airline-name  (protected — airline only)
exports.updateAirlineName = async (req, res) => {
  try {
    const { airlineName } = req.body;
    if (!airlineName?.trim())
      return res.status(400).json({ message: 'Airline name is required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'airline')
      return res.status(403).json({ message: 'Only airline accounts can update the airline name.' });

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: { airlineName: airlineName.trim() } },
      { new: true, runValidators: false },
    );

    const token = signToken(updatedUser);
    res.json({ message: 'Airline name updated successfully.', token, user: publicUser(updatedUser) });
  } catch (err) {
    console.error('Update airline name error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/auth/link-registration  (protected)
exports.linkRegistration = async (req, res) => {
  try {
    const { registrationId, registrationModel } = req.body;
    if (!registrationId || !registrationModel)
      return res.status(400).json({ message: 'registrationId and registrationModel are required.' });

    const VALID_MODELS = ['Individual', 'Airlines', 'AirlinesSubscription'];
    if (!VALID_MODELS.includes(registrationModel))
      return res.status(400).json({ message: 'Invalid registrationModel.' });

    // Verify the registration record's email matches the calling user's email
    // so a user cannot link someone else's record to their account.
    // Check ALL email fields on the doc — airlines have separate email/pointOfContactEmail/paymentEmail.
    if (req.user.role !== 'admin') {
      const Individual = require('../models/Individual');
      const Airlines   = require('../models/Airlines');
      const Model = registrationModel === 'Individual' ? Individual : Airlines;
      const doc = await Model.findById(registrationId).lean();
      if (!doc) return res.status(404).json({ message: 'Registration record not found.' });
      const userEmail = (req.user.email || '').toLowerCase();
      const docEmails = [
        doc.email, doc.pointOfContactEmail, doc.contactEmail, doc.paymentEmail,
      ].filter(Boolean).map(e => e.toLowerCase());
      if (!docEmails.length || !docEmails.includes(userEmail))
        return res.status(403).json({ message: 'This registration does not belong to your account.' });
    }

    const oid = new mongoose.Types.ObjectId(registrationId);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        registrationId,
        registrationModel,
        // Also push to subscriptionIds if not already present
        $addToSet: { subscriptionIds: oid },
      },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const token = signToken(user);
    res.json({ message: 'Registration linked.', token, user: publicUser(user) });
  } catch (err) {
    console.error('Link registration error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/auth/add-secondary-email  (protected — airline only)
exports.addSecondaryEmail = async (req, res) => {
  try {
    const { currentPassword, secondaryEmail } = req.body;
    if (!currentPassword) return res.status(400).json({ message: 'Current password is required.' });
    if (!secondaryEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondaryEmail))
      return res.status(400).json({ message: 'Enter a valid email address.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'airline') return res.status(403).json({ message: 'Only airline accounts can add secondary emails.' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    const normalEmail = secondaryEmail.toLowerCase().trim();

    if (normalEmail === user.email)
      return res.status(400).json({ message: 'This is already your primary email.' });
    if ((user.secondaryEmails || []).includes(normalEmail))
      return res.status(409).json({ message: 'This email is already a secondary login for your account.' });

    // Make sure no other account uses it as primary or secondary
    const conflict = await User.findOne({
      $or: [{ email: normalEmail }, { secondaryEmails: normalEmail }],
    });
    if (conflict) return res.status(409).json({ message: 'This email is already in use by another account.' });

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { secondaryEmails: normalEmail } },
      { new: true, runValidators: false },
    );

    const token = signToken(updatedUser);
    res.json({ message: 'Secondary email added.', token, user: publicUser(updatedUser) });
  } catch (err) {
    console.error('Add secondary email error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/auth/remove-secondary-email  (protected — airline only)
exports.removeSecondaryEmail = async (req, res) => {
  try {
    const { currentPassword, secondaryEmail } = req.body;
    if (!currentPassword) return res.status(400).json({ message: 'Current password is required.' });
    if (!secondaryEmail) return res.status(400).json({ message: 'secondaryEmail is required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'airline') return res.status(403).json({ message: 'Only airline accounts can manage secondary emails.' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    const normalEmail = secondaryEmail.toLowerCase().trim();
    if (!(user.secondaryEmails || []).includes(normalEmail))
      return res.status(404).json({ message: 'Secondary email not found on this account.' });

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $pull: { secondaryEmails: normalEmail } },
      { new: true, runValidators: false },
    );

    const token = signToken(updatedUser);
    res.json({ message: 'Secondary email removed.', token, user: publicUser(updatedUser) });
  } catch (err) {
    console.error('Remove secondary email error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ── OTP helpers ───────────────────────────────────────────────────────────────
function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Strip any whitespace/non-digits so the stored and submitted codes always
// compare cleanly (guards against spaces, newlines or autofill artefacts).
function normalizeCode(code) {
  return String(code || '').replace(/\D/g, '');
}

async function createAndSendOtp(email, purpose) {
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  // Invalidate any prior unused OTPs for this email+purpose
  await OTP.deleteMany({ email: email.toLowerCase(), purpose, used: false });
  await OTP.create({ email: email.toLowerCase(), code, purpose, expiresAt });
  await sendOtpEmail(email.toLowerCase(), code, purpose);
}

async function verifyOtp(email, code, purpose) {
  const record = await OTP.findOne({
    email:   email.toLowerCase(),
    code:    normalizeCode(code),
    purpose,
    used:    false,
    expiresAt: { $gt: new Date() },
  });
  return record;
}

// POST /api/auth/send-otp
// Body: { email, purpose: 'signup' | 'password-reset' | 'secondary-email' }
exports.sendOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose) return res.status(400).json({ message: 'email and purpose are required.' });
    const validPurposes = ['signup', 'password-reset', 'secondary-email'];
    if (!validPurposes.includes(purpose)) return res.status(400).json({ message: 'Invalid purpose.' });

    const normalEmail = email.toLowerCase().trim();

    if (purpose === 'signup') {
      // Don't send if email already registered as primary or secondary
      const existing = await User.findOne({ $or: [{ email: normalEmail }, { secondaryEmails: normalEmail }] });
      if (existing) return res.status(409).json({ message: 'This email is already associated with an account.' });
    }

    if (purpose === 'password-reset') {
      const existing = await User.findOne({ email: normalEmail });
      if (!existing) {
        // Don't reveal whether account exists — return 200 silently
        return res.json({ message: 'If an account exists, a reset code has been sent.' });
      }
    }

    await createAndSendOtp(normalEmail, purpose);
    res.json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('sendOtp error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

// POST /api/auth/verify-otp-signup
// Body: { email, code, password, role, firstName, lastName, airlineName }
exports.verifyOtpAndSignup = async (req, res) => {
  try {
    const { email, code, password, role, firstName, lastName, airlineName, logoUrl } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'email and code are required.' });
    if (!password || !role) return res.status(400).json({ message: 'password and role are required.' });
    if (role === 'admin') return res.status(403).json({ message: 'Admin accounts cannot be self-registered.' });
    if (role === 'airline' && !airlineName?.trim()) return res.status(400).json({ message: 'Airline name is required for airline accounts.' });

    const record = await verifyOtp(email, code, 'signup');
    if (!record) return res.status(400).json({ message: 'Invalid or expired verification code.' });

    // Mark OTP as used
    record.used = true;
    await record.save();

    const normalSignupEmail = email.toLowerCase();
    const existing = await User.findOne({ $or: [{ email: normalSignupEmail }, { secondaryEmails: normalSignupEmail }] });
    if (existing) return res.status(409).json({ message: 'This email is already associated with an account.' });

    const user = await User.create({
      email, password, role, firstName, lastName,
      airlineName: role === 'airline' ? airlineName.trim() : '',
      logoUrl: role === 'airline' && logoUrl ? logoUrl : '',
    });
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('verifyOtpAndSignup error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

// POST /api/auth/reset-password
// Body: { email, code, newPassword }
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'email, code and newPassword are required.' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const record = await verifyOtp(email, code, 'password-reset');
    if (!record) return res.status(400).json({ message: 'Invalid or expired reset code.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Account not found.' });

    record.used = true;
    await record.save();

    user.password = await bcrypt.hash(newPassword, 12);
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('resetPasswordWithOtp error:', err);
    res.status(500).json({ message: 'Server error during password reset.' });
  }
};

// POST /api/auth/send-secondary-email-otp  (protected — airline only)
// Body: { secondaryEmail }
exports.sendSecondaryEmailOtp = async (req, res) => {
  try {
    const { secondaryEmail } = req.body;
    if (!secondaryEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondaryEmail))
      return res.status(400).json({ message: 'Enter a valid email address.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'airline') return res.status(403).json({ message: 'Only airline accounts can add secondary emails.' });

    const normalEmail = secondaryEmail.toLowerCase().trim();

    if (normalEmail === user.email) return res.status(400).json({ message: 'This is already your primary email.' });
    if ((user.secondaryEmails || []).includes(normalEmail))
      return res.status(409).json({ message: 'This email is already a secondary login for your account.' });

    const conflict = await User.findOne({ $or: [{ email: normalEmail }, { secondaryEmails: normalEmail }] });
    if (conflict) return res.status(409).json({ message: 'This email is already in use by another account.' });

    await createAndSendOtp(normalEmail, 'secondary-email');
    res.json({ message: 'Verification code sent to the new email address.' });
  } catch (err) {
    console.error('sendSecondaryEmailOtp error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

// POST /api/auth/verify-secondary-email  (protected — airline only)
// Body: { secondaryEmail, code, currentPassword }
exports.verifyOtpAndAddSecondary = async (req, res) => {
  try {
    const { secondaryEmail, code, currentPassword } = req.body;
    if (!secondaryEmail || !code || !currentPassword)
      return res.status(400).json({ message: 'secondaryEmail, code and currentPassword are required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'airline') return res.status(403).json({ message: 'Only airline accounts can add secondary emails.' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    const normalEmail = secondaryEmail.toLowerCase().trim();

    const record = await verifyOtp(normalEmail, code, 'secondary-email');
    if (!record) return res.status(400).json({ message: 'Invalid or expired verification code.' });

    if (normalEmail === user.email) return res.status(400).json({ message: 'This is already your primary email.' });
    if ((user.secondaryEmails || []).includes(normalEmail))
      return res.status(409).json({ message: 'This email is already a secondary login for your account.' });

    const conflict = await User.findOne({ $or: [{ email: normalEmail }, { secondaryEmails: normalEmail }] });
    if (conflict) return res.status(409).json({ message: 'This email is already in use by another account.' });

    record.used = true;
    await record.save();

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { secondaryEmails: normalEmail } },
      { new: true, runValidators: false },
    );

    const token = signToken(updatedUser);
    res.json({ message: 'Secondary email verified and added.', token, user: publicUser(updatedUser) });
  } catch (err) {
    console.error('verifyOtpAndAddSecondary error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/auth/send-credential-change-otp  (protected)
// Verifies current password, then sends OTP to the user's current email.
// Body: { currentPassword }
exports.sendCredentialChangeOtp = async (req, res) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) return res.status(400).json({ message: 'Current password is required.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    await createAndSendOtp(user.email, 'credential-change');
    res.json({ message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('sendCredentialChangeOtp error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

// POST /api/auth/verify-otp-and-update-credentials  (protected)
// Verifies OTP then updates email/password atomically.
// Body: { currentPassword, otp, newEmail?, newPassword? }
exports.verifyOtpAndUpdateCredentials = async (req, res) => {
  try {
    const { currentPassword, otp, newEmail, newPassword } = req.body;
    if (!currentPassword || !otp) return res.status(400).json({ message: 'currentPassword and otp are required.' });
    if (!newEmail && !newPassword) return res.status(400).json({ message: 'Provide a new email or new password.' });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    const record = await verifyOtp(user.email, otp, 'credential-change');
    if (!record) return res.status(400).json({ message: 'Invalid or expired verification code.' });

    const updateFields = {};

    if (newEmail && newEmail.toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: newEmail.toLowerCase() });
      if (exists) return res.status(409).json({ message: 'This email is already in use.' });
      updateFields.email = newEmail.toLowerCase();
    }

    if (newPassword) {
      if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters.' });
      updateFields.password = await bcrypt.hash(newPassword, 12);
      updateFields.mustChangePassword = false;
    }

    record.used = true;
    await record.save();

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $set: updateFields },
      { new: true, runValidators: false },
    );

    const token = signToken(updatedUser);
    res.json({ message: 'Credentials updated successfully.', token, user: publicUser(updatedUser) });
  } catch (err) {
    console.error('verifyOtpAndUpdateCredentials error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/auth/add-subscription  (protected)
// Adds a new subscription ID to the user's subscriptionIds array without
// overwriting the primary registrationId. Used when airline creates a new plan.
exports.addSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    if (!subscriptionId)
      return res.status(400).json({ message: 'subscriptionId is required.' });

    if (!mongoose.Types.ObjectId.isValid(subscriptionId))
      return res.status(400).json({ message: 'Invalid subscriptionId.' });

    const oid = new mongoose.Types.ObjectId(subscriptionId);

    // ── Ownership verification ────────────────────────────────────────────────
    // Without this, any authenticated user could $addToSet ANY registration id
    // into their own subscriptionIds and then read that record's payments,
    // invoices and PII (the ownership checks downstream trust subscriptionIds).
    // Verify the registration's email matches the caller's email. Admins skip.
    if (req.user.role !== 'admin') {
      const Individual           = require('../models/Individual');
      const Airlines             = require('../models/Airlines');
      const AirlinesSubscription = require('../models/AirlinesSubscription');
      const [ind, air, legacy] = await Promise.all([
        Individual.findById(oid).select('email').lean(),
        Airlines.findById(oid).select('email pointOfContactEmail paymentEmail').lean(),
        AirlinesSubscription.findById(oid).select('email contactEmail paymentEmail').lean(),
      ]);
      const doc = ind || air || legacy;
      if (!doc)
        return res.status(404).json({ message: 'Registration record not found.' });
      const userEmail = (req.user.email || '').toLowerCase();
      const docEmails = [
        doc.email, doc.pointOfContactEmail, doc.contactEmail, doc.paymentEmail,
      ].filter(Boolean).map(e => String(e).toLowerCase());
      if (!userEmail || !docEmails.includes(userEmail))
        return res.status(403).json({ message: 'This subscription does not belong to your account.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { subscriptionIds: oid } },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const token = signToken(user);
    res.json({ message: 'Subscription added.', token, user: publicUser(user) });
  } catch (err) {
    console.error('Add subscription error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ── Admin: list signed-up accounts that have NOT created a registration/plan ───
// These are users (role airline/individual) with no linked registration — they
// signed up but never filled the form, so the dashboard can surface them and let
// admin add a plan on their behalf.
exports.listAccountsWithoutPlan = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Admin access required.' });

    const roleParam = req.query.role;
    const roleFilter = ['individual', 'airline'].includes(roleParam)
      ? roleParam
      : { $in: ['individual', 'airline'] };

    const users = await User.find({ role: roleFilter, registrationId: null })
      .select('email firstName lastName airlineName role createdAt mustChangePassword')
      .sort({ createdAt: -1 })
      .lean();

    // Defensive: exclude any whose email already has a registration (legacy records
    // may not have linked registrationId back on the user).
    const emails = users.map(u => u.email).filter(Boolean);
    const [indDocs, airDocs] = await Promise.all([
      Individual.find({ email: { $in: emails } }).select('email').lean(),
      Airlines.find({ email: { $in: emails } }).select('email').lean(),
    ]);
    const taken = new Set([
      ...indDocs.map(d => String(d.email || '').toLowerCase()),
      ...airDocs.map(d => String(d.email || '').toLowerCase()),
    ]);
    const result = users.filter(u => !taken.has(String(u.email || '').toLowerCase()));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

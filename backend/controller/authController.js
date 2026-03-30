const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'ifoa_super_secret_2024';
const JWT_EXPIRES = '7d';

const signToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName } = req.body;
    if (!email || !password || !role)
      return res.status(400).json({ message: 'Email, password and role are required.' });
    if (role === 'admin')
      return res.status(403).json({ message: 'Admin accounts cannot be self-registered.' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ email, password, role, firstName, lastName });
    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, registrationId: user.registrationId },
    });
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
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password.' });
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, registrationId: user.registrationId },
    });
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
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/auth/seed-admin-signup
// Accessible only by manually typing the URL. Creates an admin account.
exports.seedAdminSignup = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: 'An account with this email already exists.' });

    const admin = await User.create({
      email: email.toLowerCase(),
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
// Accessible only by manually typing the URL. Logs in admin accounts only.
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
// Body: { currentPassword, newEmail?, newPassword? }
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

    if (newEmail && newEmail.toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: newEmail.toLowerCase() });
      if (exists) return res.status(409).json({ message: 'This email is already in use.' });
      user.email = newEmail.toLowerCase();
    }

    if (newPassword) {
      if (newPassword.length < 8)
        return res.status(400).json({ message: 'New password must be at least 8 characters.' });
      user.password = newPassword; // pre-save hook will hash it
    }

    await user.save();

    // Issue a fresh token with potentially new email
    const token = signToken(user);
    res.json({
      message: 'Credentials updated successfully.',
      token,
      user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, registrationId: user.registrationId },
    });
  } catch (err) {
    console.error('Update credentials error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PUT /api/auth/link-registration  (protected)
// Called after a user submits the registration form to link the record to their account
// Body: { registrationId, registrationModel }
exports.linkRegistration = async (req, res) => {
  try {
    const { registrationId, registrationModel } = req.body;
    if (!registrationId || !registrationModel)
      return res.status(400).json({ message: 'registrationId and registrationModel are required.' });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { registrationId, registrationModel },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found.' });

    const token = signToken(user);
    res.json({
      message: 'Registration linked.',
      token,
      user: { id: user._id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, registrationId: user.registrationId },
    });
  } catch (err) {
    console.error('Link registration error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

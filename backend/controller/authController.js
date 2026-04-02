const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'ifoa_super_secret_2024';
const JWT_EXPIRES = '7d';

const signToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

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
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ message: 'An account with this email already exists.' });
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
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid email or password.' });
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

    if (newEmail && newEmail.toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: newEmail.toLowerCase() });
      if (exists) return res.status(409).json({ message: 'This email is already in use.' });
      user.email = newEmail.toLowerCase();
    }

    if (newPassword) {
      if (newPassword.length < 8)
        return res.status(400).json({ message: 'New password must be at least 8 characters.' });
      user.password = newPassword;
    }

    await user.save();

    const token = signToken(user);
    res.json({ message: 'Credentials updated successfully.', token, user: publicUser(user) });
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

    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();

    await user.save();

    const token = signToken(user);
    res.json({ message: 'Profile updated successfully.', token, user: publicUser(user) });
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

    user.airlineName = airlineName.trim();
    await user.save();

    const token = signToken(user);
    res.json({ message: 'Airline name updated successfully.', token, user: publicUser(user) });
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

    const mongoose = require('mongoose');
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

// PUT /api/auth/add-subscription  (protected)
// Adds a new subscription ID to the user's subscriptionIds array without
// overwriting the primary registrationId. Used when airline creates a new plan.
exports.addSubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.body;
    if (!subscriptionId)
      return res.status(400).json({ message: 'subscriptionId is required.' });

    const mongoose = require('mongoose');
    const oid = new mongoose.Types.ObjectId(subscriptionId);

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

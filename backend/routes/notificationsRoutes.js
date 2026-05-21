const express     = require('express');
const router      = express.Router();
const auth        = require('../middleware/auth');
const { getNotifications } = require('../controller/notificationsController');
const HolderEvent = require('../models/HolderEvent');
const Individual  = require('../models/Individual');
const User        = require('../models/User');
const Airlines    = require('../models/Airlines');
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  next();
};

router.get('/', auth, getNotifications);

// ── GET /api/notifications/holder-events — admin list of all holder events ───
router.get('/holder-events', auth, adminOnly, async (req, res) => {
  try {
    const events = await HolderEvent.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ success: true, data: events });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/notifications/holder-events/:id — update status/notes ─────────
router.patch('/holder-events/:id', auth, adminOnly, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const ev = await HolderEvent.findById(req.params.id);
    if (!ev) return res.status(404).json({ success: false, message: 'Event not found.' });

    if (status) ev.status = status;
    if (adminNotes !== undefined) ev.adminNotes = adminNotes;
    await ev.save();

    return res.json({ success: true, data: ev });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/notifications/holder-events/:id/convert ─────────────────────────
// Admin converts a 'holder-removed' event holder to an individual account.
// Creates Individual + User, marks event as converted.
router.post('/holder-events/:id/convert', auth, adminOnly, async (req, res) => {
  try {
    const ev = await HolderEvent.findById(req.params.id);
    if (!ev) return res.status(404).json({ success: false, message: 'Event not found.' });
    if (ev.type !== 'holder-removed')
      return res.status(400).json({ success: false, message: 'Only holder-removed events can be converted.' });
    if (ev.status === 'converted')
      return res.status(400).json({ success: false, message: 'Already converted.' });

    const snapshot = ev.holderSnapshot || {};
    const holderEmail = (ev.holderEmail || snapshot.email || '').toLowerCase().trim();
    if (!holderEmail)
      return res.status(400).json({ success: false, message: 'Holder has no email address.' });

    const existing = await User.findOne({ email: holderEmail });
    if (existing)
      return res.status(409).json({ success: false, message: `Account already exists for ${holderEmail}.` });

    // Load airline for plan details
    const airline = await Airlines.findById(ev.airlineId).lean();

    const nameParts = (ev.holderName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Holder';
    const lastName  = nameParts.slice(1).join(' ') || '—';
    const rawPassword = (ev.holderName || 'holder').toLowerCase().replace(/\s+/g, '');

    const primaryCertificate = snapshot.certificateType || 'Part 61 - Pilot';
    const primaryAirmanCertificate = snapshot.certificateStatus === 'NEW' ? 'NEW' : 'EXISTING';

    const airlinePlan = (airline && airline.subscriptionPlan) || '1 Year Subscription Plan';
    const INDIV_PRICE = { '1 Year Subscription Plan': 69, 'Unlimited Plan': 299, 'Multiple Years Subscription Plan': 55 };
    const individualPrice = INDIV_PRICE[airlinePlan] || 69;

    const individual = await Individual.create({
      firstName,
      lastName,
      email:             holderEmail,
      phone:             (airline && airline.phone) ? airline.phone : '0000000000',
      subscriptionPlan:  airlinePlan,
      multiYearCount:    (airline && airline.multiYearCount)  || null,
      price:             individualPrice,
      subscriptionDate:  (airline && airline.subscriptionDate) || null,
      expirationDate:    (airline && airline.expirationDate)   || null,
      status:            'Active',
      paymentStatus:     'paid',
      isPaid:            true,
      isFormCompleted:   true,
      primaryCertificate,
      primaryAirmanCertificate,
      faaCertificateNumber:          snapshot.faaCertificateNumber          || '',
      iacraTrackingNumber:           snapshot.iacraFtnNumber                || '',
      hasSecondaryCertificate:       snapshot.hasSecondaryCertificate       || false,
      secondaryCertificate:          snapshot.secondaryCertificateType      || '',
      secondaryFaaCertificateNumber: snapshot.secondaryFaaCertificateNumber || '',
      secondaryIacraTrackingNumber:  snapshot.secondaryIacraFtnNumber       || '',
      dateOfBirth:       snapshot.dateOfBirth || null,
      agreedToTerms:     true,
      convertedFromAirlineId:   airline ? airline._id : null,
      convertedFromAirlineName: airline ? (airline.airlineName || `${airline.firstName || ''} ${airline.lastName || ''}`.trim()) : '',
    });

    await User.create({
      email:              holderEmail,
      password:           rawPassword,
      role:               'individual',
      firstName,
      lastName,
      registrationId:     individual._id,
      registrationModel:  'Individual',
      mustChangePassword: true,
      subscriptionIds:    [individual._id],
    });

    ev.status = 'converted';
    ev.convertedIndividualId = individual._id;
    ev.performedBy = 'admin';
    ev.adminNotes = (ev.adminNotes ? ev.adminNotes + '\n' : '') + `Converted by admin on ${new Date().toISOString()}.`;
    await ev.save();

    return res.json({
      success: true,
      data: {
        event: ev,
        individual,
        credentials: { email: holderEmail, password: rawPassword },
      },
    });
  } catch (err) {
    if (err?.code === 11000)
      return res.status(409).json({ success: false, message: 'Account already exists for this email.' });
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const authMiddleware = require('../middleware/auth');
const { uploadBuffer } = require('../utils/cloudinary');
const Airlines    = require('../models/Airlines');
const Individual  = require('../models/Individual');
const User        = require('../models/User');
const HolderEvent = require('../models/HolderEvent');
const {
  createAirlinesSubscription,
  getAllAirlinesSubscriptions,
  getAirlinesSubscriptionById,
  getAirlinesSubscriptionByEmail,
  updateAirlinesSubscription,
  deleteAirlinesSubscription,
  bulkDeleteAirlines,
  setRenewalInvoiceNumber,
  updateRenewalDetails,
  exportAirlinesExcel,
  addHoldersToSubscription,
  markAirlinesPaid,
  getSignUpAirlines,
  adminCreateAirlineForm,
  adminImportAirlinesFromExcel,
  markAirlinesInvoiceGenerated,
  requestAirlineInvoice,
  renewAirlinesSubscription,
  activateWirePayment,
  activateGroupRenewalNow,
} = require('../controller/airlinesController');
const { adminHolderUpgrade, markHolderGroupPaid, adminRenew } = require('../controller/paymentController');

// 5 MB file size limit; only accept Excel MIME types
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ].includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i);
    cb(ok ? null : new Error('Only .xlsx / .xls files are accepted.'), !!ok);
  },
});

// 2 MB image upload (logo)
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/');
    cb(ok ? null : new Error('Only image files are accepted.'), !!ok);
  },
});

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  return next();
}

// Ownership check: admin passes; non-admins must own the record
function requireOwnership(req, res, next) {
  if (req.user?.role === 'admin') return next();
  const id        = req.params.id;
  const userSubIds = (req.user?.subscriptionIds || []).map(String);
  const userRegId  = req.user?.registrationId ? String(req.user.registrationId) : null;
  if (userRegId === id || userSubIds.includes(id)) return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}

// ── Logo upload (Cloudinary) ─────────────────────────────────────────────────
// Standalone upload — returns a URL (used during signup before record exists)
router.post('/upload-logo', imageUpload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  try {
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'airline-logos',
      resource_type: 'image',
      format: 'webp',
      transformation: [{ width: 400, height: 400, crop: 'limit' }],
    });
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Logo upload error:', err);
    res.status(500).json({ message: 'Upload failed.' });
  }
});

// Update logo on an existing Airlines record
router.patch('/:id/logo', authMiddleware, requireOwnership, imageUpload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
  try {
    const result = await uploadBuffer(req.file.buffer, {
      folder: 'airline-logos',
      resource_type: 'image',
      format: 'webp',
      transformation: [{ width: 400, height: 400, crop: 'limit' }],
    });
    const updated = await Airlines.findByIdAndUpdate(
      req.params.id,
      { logoUrl: result.secure_url },
      { new: true },
    );
    if (!updated) return res.status(404).json({ message: 'Airline record not found.' });
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Logo update error:', err);
    res.status(500).json({ message: 'Upload failed.' });
  }
});

// ── Public — registration form submit ────────────────────────────────────────
router.post('/', createAirlinesSubscription);

// ── Static / named routes BEFORE /:id ────────────────────────────────────────
router.get('/export/excel',   authMiddleware, requireAdmin, exportAirlinesExcel);
// Restricted to admin — the list exposes all airline names and emails
router.get('/signup/list',    authMiddleware, requireAdmin, getSignUpAirlines);
// Restricted to admin or same email (enforced inside controller)
router.get('/by-email',       authMiddleware, getAirlinesSubscriptionByEmail);

// ── Admin create / import ─────────────────────────────────────────────────────
router.post('/admin/create-form',  authMiddleware, requireAdmin, adminCreateAirlineForm);
router.post('/admin/import-excel', authMiddleware, requireAdmin, upload.single('file'), adminImportAirlinesFromExcel);

// ── Record-level actions ──────────────────────────────────────────────────────
// mark-paid bypasses Stripe — admin only
router.patch('/:id/mark-paid',              authMiddleware, requireAdmin, markAirlinesPaid);
router.patch('/:id/renewal-invoice',        authMiddleware, requireAdmin, setRenewalInvoiceNumber);
router.patch('/:id/renewal-details',        authMiddleware, requireAdmin, updateRenewalDetails);
// wire invoice request — owner or admin
router.patch('/:id/request-invoice',        authMiddleware, requireOwnership, requestAirlineInvoice);
router.patch('/:id/mark-invoice-generated', authMiddleware, requireAdmin, markAirlinesInvoiceGenerated);
router.patch('/:id/activate-wire', authMiddleware, requireAdmin, activateWirePayment);
// admin manual holder-upgrade (increase committed count + create holder group)
router.post('/:id/admin-holder-upgrade', authMiddleware, requireAdmin, adminHolderUpgrade);
router.post('/:id/holder-group/:groupId/mark-paid', authMiddleware, requireAdmin, markHolderGroupPaid);
// force-activate a holder group's queued renewal now (admin)
router.post('/:id/holder-group/:groupId/activate-renewal', authMiddleware, requireAdmin, activateGroupRenewalNow);
// add-holders — owner or admin
router.patch('/:id/add-holders',            authMiddleware, requireOwnership, addHoldersToSubscription);
// renew — ADMIN ONLY. This endpoint extends the plan WITHOUT collecting payment,
// so it must never be reachable by record owners (that was a free-renewal loophole).
// Paid self-service renewals go through the Stripe flow: POST /api/payments/create-intent
// (purpose:'renewal') + /confirm, which applies the renewal only after payment succeeds.
router.post('/:id/renew',                   authMiddleware, requireAdmin, renewAirlinesSubscription);
// Admin renews on the customer's behalf (no payment) + generates invoice.
// Same queued/immediate flow as the Stripe path; admin sets plan/count/price/invoice.
router.post('/:id/admin-renew',             authMiddleware, requireAdmin, adminRenew);

// ── Holder management (owner or admin) ───────────────────────────────────────

// PATCH /:id/holders/:holderId — update a single holder's details
router.patch('/:id/holders/:holderId', authMiddleware, requireOwnership, async (req, res) => {
  try {
    const airline = await Airlines.findById(req.params.id);
    if (!airline) return res.status(404).json({ success: false, message: 'Airline not found.' });

    const holder = airline.certificateHolders.id(req.params.holderId);
    if (!holder) return res.status(404).json({ success: false, message: 'Holder not found.' });

    const allowed = [
      'fullName', 'certificateType', 'certificateStatus', 'faaCertificateNumber',
      'iacraFtnNumber', 'email', 'dateOfBirth',
      'hasSecondaryCertificate', 'secondaryCertificateType',
      'secondaryFaaCertificateNumber', 'secondaryIacraFtnNumber',
    ];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) holder[field] = req.body[field];
    });

    // Reassign holder to a holder group (or base plan when null/'').
    if (req.body.holderGroupId !== undefined) {
      const target = req.body.holderGroupId || null;
      if (target) {
        const group = airline.holderGroups.id(target);
        if (!group) return res.status(400).json({ success: false, message: 'Holder group not found.' });
        const used = airline.certificateHolders.filter(
          h => String(h.holderGroupId || '') === String(target) && String(h._id) !== String(holder._id),
        ).length;
        if (used >= group.count)
          return res.status(400).json({ success: false, message: `This plan group is full (${group.count} slot${group.count !== 1 ? 's' : ''}).` });
      }
      holder.holderGroupId = target;
    }

    await airline.save();
    return res.json({ success: true, data: airline });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /:id/holders/:holderId — remove a single holder from the airline
router.delete('/:id/holders/:holderId', authMiddleware, requireOwnership, async (req, res) => {
  try {
    const airline = await Airlines.findById(req.params.id);
    if (!airline) return res.status(404).json({ success: false, message: 'Airline not found.' });

    const holder = airline.certificateHolders.id(req.params.holderId);
    if (!holder) return res.status(404).json({ success: false, message: 'Holder not found.' });

    const snapshot = holder.toObject();

    // Remove the holder subdoc
    airline.certificateHolders.pull({ _id: req.params.holderId });
    await airline.save();

    // Persist the event so admin gets notified
    await HolderEvent.create({
      type:           'holder-removed',
      airlineId:      airline._id,
      airlineName:    airline.airlineName || `${airline.firstName} ${airline.lastName}`.trim(),
      holderName:     snapshot.fullName || '',
      holderEmail:    snapshot.email    || '',
      holderSnapshot: snapshot,
      status:         'pending-contact',
      performedBy:    req.user.role === 'admin' ? 'admin' : 'airline',
    });

    return res.json({ success: true, data: airline });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /:id/holders/:holderId/convert — convert holder directly to an Individual account
router.post('/:id/holders/:holderId/convert', authMiddleware, requireOwnership, async (req, res) => {
  try {
    const airline = await Airlines.findById(req.params.id);
    if (!airline) return res.status(404).json({ success: false, message: 'Airline not found.' });

    const holder = airline.certificateHolders.id(req.params.holderId);
    if (!holder) return res.status(404).json({ success: false, message: 'Holder not found.' });

    const snapshot = holder.toObject();

    const holderEmail = (snapshot.email || '').toLowerCase().trim();
    if (!holderEmail) {
      return res.status(400).json({ success: false, message: 'Holder has no email address. Cannot create an account.' });
    }

    // Check no existing user with this email
    const existing = await User.findOne({ email: holderEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: `An account already exists for ${holderEmail}.` });
    }

    // Build name parts from fullName (e.g. "John Smith" → first="John" last="Smith")
    const nameParts = (snapshot.fullName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Holder';
    const lastName  = nameParts.slice(1).join(' ') || '—';

    const rawPassword = '12345678';

    // Map holder certificate type to Individual enum (same values, direct mapping)
    const primaryCertificate = snapshot.certificateType || 'Part 61 - Pilot';
    const primaryAirmanCertificate = snapshot.certificateStatus === 'NEW' ? 'NEW' : 'EXISTING';

    // keepSubscription=true  → copy airline plan/dates, mark Active (airline already paid)
    // keepSubscription=false → create pending account only, no active plan, holder pays independently
    const keepSubscription = req.body.keepSubscription !== false; // default true

    // Use what the airline actually paid per certificate, not the individual plan rate
    const individualPrice = airline.pricePerCertificate || 0;

    const individual = await Individual.create({
      firstName,
      lastName,
      email:          holderEmail,
      phone:          airline.phone || '0000000000',
      subscriptionPlan:  airline.subscriptionPlan,
      multiYearCount:    airline.multiYearCount || null,
      price:             keepSubscription ? individualPrice : 0,
      subscriptionDate:  keepSubscription ? (airline.subscriptionDate || null) : null,
      expirationDate:    keepSubscription ? (airline.expirationDate   || null) : null,
      status:            keepSubscription ? 'Active'  : 'Pending',
      paymentStatus:     keepSubscription ? 'paid'    : 'pending',
      isPaid:            keepSubscription,
      isFormCompleted:   true,
      // Never auto-generate invoice — airline already paid; no new charge regardless of keepSubscription
      invoiceGenerated:  false,
      primaryCertificate,
      primaryAirmanCertificate,
      faaCertificateNumber:          snapshot.faaCertificateNumber  || '',
      iacraTrackingNumber:           snapshot.iacraFtnNumber        || '',
      hasSecondaryCertificate:       snapshot.hasSecondaryCertificate || false,
      secondaryCertificate:          snapshot.secondaryCertificateType         || '',
      secondaryFaaCertificateNumber: snapshot.secondaryFaaCertificateNumber    || '',
      secondaryIacraTrackingNumber:  snapshot.secondaryIacraFtnNumber          || '',
      dateOfBirth:      snapshot.dateOfBirth || null,
      agreedToTerms:    true,
      convertedFromAirlineId:   airline._id,
      convertedFromAirlineName: airline.airlineName || `${airline.firstName} ${airline.lastName}`.trim(),
    });

    // Create login account for the converted holder
    await User.create({
      email:              holderEmail,
      password:           rawPassword,
      role:               'individual',
      firstName,
      lastName,
      registrationId:     individual._id,
      registrationModel:  'Individual',
      mustChangePassword: true, // force password change on first login
      subscriptionIds:    [individual._id],
    });

    // Remove holder from airline
    airline.certificateHolders.pull({ _id: req.params.holderId });
    await airline.save();

    // Persist event for admin visibility
    const event = await HolderEvent.create({
      type:                  'holder-converted',
      airlineId:             airline._id,
      airlineName:           airline.airlineName || `${airline.firstName} ${airline.lastName}`.trim(),
      holderName:            snapshot.fullName || '',
      holderEmail:           holderEmail,
      holderSnapshot:        snapshot,
      convertedIndividualId: individual._id,
      status:                'converted',
      performedBy:           req.user.role === 'admin' ? 'admin' : 'airline',
      adminNotes:            keepSubscription
        ? 'Airline kept subscription active — plan and dates carried over from airline.'
        : 'Airline cancelled subscription — individual account created without active plan.',
    });

    return res.json({
      success: true,
      data: {
        airline,
        individual,
        event,
        keepSubscription,
        credentials: { email: holderEmail, password: rawPassword },
      },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account already exists for this email.' });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/',    authMiddleware, requireAdmin,    getAllAirlinesSubscriptions);
router.delete('/bulk', authMiddleware, requireAdmin, bulkDeleteAirlines);
router.get('/:id', authMiddleware, requireOwnership, getAirlinesSubscriptionById);
router.put('/:id', authMiddleware, requireOwnership, updateAirlinesSubscription);
router.delete('/:id', authMiddleware, requireAdmin, deleteAirlinesSubscription);

module.exports = router;

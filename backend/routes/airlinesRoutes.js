const express = require('express');
const multer = require('multer');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createAirlinesSubscription,
  getAllAirlinesSubscriptions,
  getAirlinesSubscriptionById,
  getAirlinesSubscriptionByEmail,
  updateAirlinesSubscription,
  deleteAirlinesSubscription,
  exportAirlinesExcel,
  addHoldersToSubscription,
  markAirlinesPaid,
  getSignUpAirlines,
  adminCreateAirlineForm,
  adminImportAirlinesFromExcel,
  markAirlinesInvoiceGenerated,
  requestAirlineInvoice,
} = require('../controller/airlinesController');

const upload = multer({ storage: multer.memoryStorage() });

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  return next();
}

// Public
router.post('/', createAirlinesSubscription);

// ── Static/named routes MUST come before /:id to prevent "excel" being treated as an ID ──
router.get('/export/excel', exportAirlinesExcel);
router.get('/signup/list', getSignUpAirlines); // Get all signed-up airlines for dropdown
router.post('/admin/create-form', adminCreateAirlineForm); // Admin create airline form
router.post('/admin/import-excel', authMiddleware, requireAdmin, upload.single('file'), adminImportAirlinesFromExcel);

// Email lookup
router.get('/by-email', getAirlinesSubscriptionByEmail);

// Mark as paid immediately after Stripe payment completes on the frontend
router.patch('/:id/mark-paid', markAirlinesPaid);

// Airline wire transfer invoice request (user action from airline step 4)
router.patch('/:id/request-invoice', requestAirlineInvoice);

// Mark invoice as generated (admin only)
router.patch('/:id/mark-invoice-generated', markAirlinesInvoiceGenerated);

// Admin CRUD
router.get('/', getAllAirlinesSubscriptions);
router.get('/:id', getAirlinesSubscriptionById);
router.patch('/:id/add-holders', addHoldersToSubscription);
router.put('/:id', updateAirlinesSubscription);
router.delete('/:id', deleteAirlinesSubscription);

module.exports = router;

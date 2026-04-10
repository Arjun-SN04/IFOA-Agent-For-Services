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

// ── Public — registration form submit ────────────────────────────────────────
router.post('/', createAirlinesSubscription);

// ── Static / named routes BEFORE /:id ────────────────────────────────────────
router.get('/export/excel',   authMiddleware, requireAdmin, exportAirlinesExcel);
router.get('/signup/list',    authMiddleware, getSignUpAirlines);
router.get('/by-email',       authMiddleware, getAirlinesSubscriptionByEmail);

// ── Admin create / import ────────────────────────────────────────────────────
router.post('/admin/create-form',  authMiddleware, requireAdmin, adminCreateAirlineForm);
router.post('/admin/import-excel', authMiddleware, requireAdmin, upload.single('file'), adminImportAirlinesFromExcel);

// ── Record-level actions ──────────────────────────────────────────────────────
router.patch('/:id/mark-paid',              authMiddleware, markAirlinesPaid);
router.patch('/:id/request-invoice',        authMiddleware, requestAirlineInvoice);
router.patch('/:id/mark-invoice-generated', authMiddleware, requireAdmin, markAirlinesInvoiceGenerated);
router.patch('/:id/add-holders',            authMiddleware, addHoldersToSubscription);

// ── CRUD — all require authentication ────────────────────────────────────────
// GET / is admin-only (list all)
// GET /:id allows any authenticated user (dashboard fetches own record by ID)
// PUT /:id allows any authenticated user (dashboard edit form)
// DELETE /:id is admin-only
router.get('/',    authMiddleware, requireAdmin, getAllAirlinesSubscriptions);
router.get('/:id', authMiddleware, getAirlinesSubscriptionById);
router.put('/:id', authMiddleware, updateAirlinesSubscription);
router.delete('/:id', authMiddleware, requireAdmin, deleteAirlinesSubscription);

module.exports = router;

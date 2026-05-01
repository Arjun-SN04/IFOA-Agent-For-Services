const express = require('express');
const multer  = require('multer');
const router  = express.Router();
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
  renewAirlinesSubscription,
} = require('../controller/airlinesController');

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
// wire invoice request — owner or admin
router.patch('/:id/request-invoice',        authMiddleware, requireOwnership, requestAirlineInvoice);
router.patch('/:id/mark-invoice-generated', authMiddleware, requireAdmin, markAirlinesInvoiceGenerated);
// add-holders — owner or admin
router.patch('/:id/add-holders',            authMiddleware, requireOwnership, addHoldersToSubscription);
// renew — owner or admin (additional ownership check inside controller)
router.post('/:id/renew',                   authMiddleware, requireOwnership, renewAirlinesSubscription);

// ── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/',    authMiddleware, requireAdmin,    getAllAirlinesSubscriptions);
router.get('/:id', authMiddleware, requireOwnership, getAirlinesSubscriptionById);
router.put('/:id', authMiddleware, requireOwnership, updateAirlinesSubscription);
router.delete('/:id', authMiddleware, requireAdmin, deleteAirlinesSubscription);

module.exports = router;

const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createIndividual,
  getAllIndividuals,
  getIndividualById,
  getIndividualByEmail,
  updateIndividual,
  deleteIndividual,
  exportToExcel,
  markIndividualPaid,
  markInvoiceGenerated,
  adminCreateIndividualForm,
  adminImportIndividualsFromExcel,
  renewIndividual,
} = require('../controller/individualController');

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
  const id         = req.params.id;
  const userSubIds = (req.user?.subscriptionIds || []).map(String);
  const userRegId  = req.user?.registrationId ? String(req.user.registrationId) : null;
  if (userRegId === id || userSubIds.includes(id)) return next();
  return res.status(403).json({ success: false, message: 'Access denied.' });
}

// ── Public — registration form submit ────────────────────────────────────────
router.post('/', createIndividual);

// ── Admin create / import ─────────────────────────────────────────────────────
router.post('/admin/create-form',  authMiddleware, requireAdmin, adminCreateIndividualForm);
router.post('/admin/import-excel', authMiddleware, requireAdmin, upload.single('file'), adminImportIndividualsFromExcel);

// ── Static / named routes BEFORE /:id ────────────────────────────────────────
router.get('/export/excel', authMiddleware, requireAdmin, exportToExcel);
// Restricted to admin or same email (enforced inside controller)
router.get('/by-email',     authMiddleware, getIndividualByEmail);

// ── Record-level actions ──────────────────────────────────────────────────────
// mark-paid bypasses Stripe — admin only
router.patch('/:id/mark-paid',              authMiddleware, requireAdmin, markIndividualPaid);
router.patch('/:id/mark-invoice-generated', authMiddleware, requireAdmin, markInvoiceGenerated);
// renew — owner or admin (additional ownership check inside controller)
router.post('/:id/renew',                   authMiddleware, requireOwnership, renewIndividual);

// ── CRUD ─────────────────────────────────────────────────────────────────────
router.get('/',    authMiddleware, requireAdmin,     getAllIndividuals);
router.get('/:id', authMiddleware, requireOwnership, getIndividualById);
router.put('/:id', authMiddleware, requireOwnership, updateIndividual);
router.delete('/:id', authMiddleware, requireAdmin,  deleteIndividual);

module.exports = router;

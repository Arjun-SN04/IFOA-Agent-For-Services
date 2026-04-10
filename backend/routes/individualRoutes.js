const express = require('express');
const multer = require('multer');
const router = express.Router();
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
} = require('../controller/individualController');

const upload = multer({ storage: multer.memoryStorage() });

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  return next();
}

// ── Public — registration form submit (unauthenticated users can register) ──
router.post('/', createIndividual);

// ── Admin create / import ────────────────────────────────────────────────────
router.post('/admin/create-form',  authMiddleware, requireAdmin, adminCreateIndividualForm);
router.post('/admin/import-excel', authMiddleware, requireAdmin, upload.single('file'), adminImportIndividualsFromExcel);

// ── Static / named routes BEFORE /:id ────────────────────────────────────────
router.get('/export/excel', authMiddleware, requireAdmin, exportToExcel);
router.get('/by-email',     authMiddleware, getIndividualByEmail);

// ── Record-level actions ──────────────────────────────────────────────────────
router.patch('/:id/mark-paid',              authMiddleware, markIndividualPaid);
router.patch('/:id/mark-invoice-generated', authMiddleware, requireAdmin, markInvoiceGenerated);

// ── CRUD — all require authentication ────────────────────────────────────────
// GET / is admin-only (list all)
// GET /:id allows any authenticated user (dashboard fetches own record by ID)
// PUT /:id allows any authenticated user (dashboard edit form)
// DELETE /:id is admin-only
router.get('/',    authMiddleware, requireAdmin, getAllIndividuals);
router.get('/:id', authMiddleware, getIndividualById);
router.put('/:id', authMiddleware, updateIndividual);
router.delete('/:id', authMiddleware, requireAdmin, deleteIndividual);

module.exports = router;

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

// Public
router.post('/', createIndividual);

// Admin create/import
router.post('/admin/create-form', authMiddleware, requireAdmin, adminCreateIndividualForm);
router.post('/admin/import-excel', authMiddleware, requireAdmin, upload.single('file'), adminImportIndividualsFromExcel);

// ── Static/named routes MUST come before /:id to prevent "excel" being treated as an ID ──
router.get('/export/excel', authMiddleware, requireAdmin, exportToExcel);

// Email lookup
router.get('/by-email', authMiddleware, getIndividualByEmail);

// Mark as paid immediately after Stripe payment completes on the frontend
router.patch('/:id/mark-paid', authMiddleware, markIndividualPaid);

// Mark invoice as generated (admin only)
router.patch('/:id/mark-invoice-generated', authMiddleware, requireAdmin, markInvoiceGenerated);

// Admin CRUD
router.get('/', getAllIndividuals);
router.get('/:id', getIndividualById);
router.put('/:id', updateIndividual);
router.delete('/:id', deleteIndividual);

module.exports = router;

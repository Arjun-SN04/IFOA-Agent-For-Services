const express = require('express');
const router = express.Router();
const {
  createIndividual,
  getAllIndividuals,
  getIndividualById,
  getIndividualByEmail,
  updateIndividual,
  deleteIndividual,
  exportToExcel,
  markIndividualPaid,
} = require('../controller/individualController');

// Public
router.post('/', createIndividual);

// ── Static/named routes MUST come before /:id to prevent "excel" being treated as an ID ──
router.get('/export/excel', exportToExcel);

// Email lookup
router.get('/by-email', getIndividualByEmail);

// Mark as paid immediately after Stripe payment completes on the frontend
router.patch('/:id/mark-paid', markIndividualPaid);

// Admin CRUD
router.get('/', getAllIndividuals);
router.get('/:id', getIndividualById);
router.put('/:id', updateIndividual);
router.delete('/:id', deleteIndividual);

module.exports = router;

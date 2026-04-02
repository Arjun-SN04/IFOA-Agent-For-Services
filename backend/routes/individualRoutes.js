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

// Email lookup (must be before /:id to avoid conflict)
router.get('/by-email', getIndividualByEmail);

// Mark as paid immediately after Stripe payment completes on the frontend
router.patch('/:id/mark-paid', markIndividualPaid);

// Admin
router.get('/', getAllIndividuals);
router.get('/export/excel', exportToExcel);
router.get('/:id', getIndividualById);
router.put('/:id', updateIndividual);
router.delete('/:id', deleteIndividual);

module.exports = router;

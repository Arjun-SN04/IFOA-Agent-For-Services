const express = require('express');
const router = express.Router();
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
} = require('../controller/airlinesController');

// Public
router.post('/', createAirlinesSubscription);

// ── Static/named routes MUST come before /:id to prevent "excel" being treated as an ID ──
router.get('/export/excel', exportAirlinesExcel);

// Email lookup
router.get('/by-email', getAirlinesSubscriptionByEmail);

// Mark as paid immediately after Stripe payment completes on the frontend
router.patch('/:id/mark-paid', markAirlinesPaid);

// Admin CRUD
router.get('/', getAllAirlinesSubscriptions);
router.get('/:id', getAirlinesSubscriptionById);
router.patch('/:id/add-holders', addHoldersToSubscription);
router.put('/:id', updateAirlinesSubscription);
router.delete('/:id', deleteAirlinesSubscription);

module.exports = router;

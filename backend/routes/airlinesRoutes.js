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

// Email lookup (must be before /:id to avoid conflict)
router.get('/by-email', getAirlinesSubscriptionByEmail);

// Mark as paid immediately after Stripe payment completes on the frontend
router.patch('/:id/mark-paid', markAirlinesPaid);

// Admin
router.get('/', getAllAirlinesSubscriptions);
router.get('/export/excel', exportAirlinesExcel);
router.get('/:id', getAirlinesSubscriptionById);
router.patch('/:id/add-holders', addHoldersToSubscription);
router.put('/:id', updateAirlinesSubscription);
router.delete('/:id', deleteAirlinesSubscription);

module.exports = router;

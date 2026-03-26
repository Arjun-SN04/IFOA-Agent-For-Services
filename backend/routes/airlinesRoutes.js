const express = require('express');
const router = express.Router();
const {
  createAirlinesSubscription,
  getAllAirlinesSubscriptions,
  getAirlinesSubscriptionById,
  updateAirlinesSubscription,
  deleteAirlinesSubscription,
  exportAirlinesExcel,
} = require('../controller/airlinesController');

// Public
router.post('/', createAirlinesSubscription);

// Admin
router.get('/', getAllAirlinesSubscriptions);
router.get('/export/excel', exportAirlinesExcel);
router.get('/:id', getAirlinesSubscriptionById);
router.put('/:id', updateAirlinesSubscription);
router.delete('/:id', deleteAirlinesSubscription);

module.exports = router;

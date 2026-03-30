const express = require('express');
const router = express.Router();
const { initiatePayment, confirmPayment } = require('../controller/paymentController');
const authMiddleware = require('../middleware/auth');

// Both routes require a logged-in user
router.post('/initiate', authMiddleware, initiatePayment);
router.post('/confirm', authMiddleware, confirmPayment);

module.exports = router;

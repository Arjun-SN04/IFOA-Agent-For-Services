const express = require('express');
const router  = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
  getPaymentsByRegistration,
  getPaymentById,
  getAllPayments,
} = require('../controller/paymentController');

const auth = require('../middleware/auth');

// Helper: admin-only guard (reads req.user set by auth middleware)
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// ── Stripe webhook — NO auth, raw body (configured in server.js) ──────────
router.post('/webhook', stripeWebhook);

// ── Create PaymentIntent — authenticated users only ─────────────────────────
router.post('/create-intent', auth, createPaymentIntent);

// ── Confirm payment from frontend after Stripe succeeds ─────────────────────
// PRIMARY path — writes the Payment record and activates the subscription.
router.post('/confirm', auth, confirmPayment);

// ── Fetch all Payment docs for a registration (user dashboard / admin) ───────
router.get('/by-registration/:id', auth, getPaymentsByRegistration);

// ── Admin: list all payments (paginated) ─────────────────────────────────────
router.get('/', auth, adminOnly, getAllPayments);

// ── Get single Payment by its _id ─────────────────────────────────────────
router.get('/:id', auth, getPaymentById);

module.exports = router;

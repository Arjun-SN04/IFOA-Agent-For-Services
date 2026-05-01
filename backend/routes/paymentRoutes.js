const express = require('express');
const router  = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
  saveInvoiceDraft,
  getPaymentsByRegistration,
  getPaymentById,
  getAllPayments,
  activateQueuedRenewal,
  autoActivateRenewal,
} = require('../controller/paymentController');

const auth = require('../middleware/auth');

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
router.post('/confirm', auth, confirmPayment);

// ── Admin: save invoice edits to the Payment doc (single source of truth) ───
// Both admin and user views read from this same document.
router.patch('/:id/save-invoice-draft', auth, adminOnly, saveInvoiceDraft);

// ── Fetch all Payment docs for a registration (user dashboard / admin) ───────
router.get('/by-registration/:id', auth, getPaymentsByRegistration);

// ── Admin: immediately activate a queued nextRenewal on a registration ───────
router.post('/admin/activate-renewal', auth, adminOnly, activateQueuedRenewal);

// ── User: auto-activate a queued renewal whose activation date has passed ────
// Safe for non-admins — ownership + activationDate-past guard enforced in controller.
router.post('/auto-activate-renewal', auth, autoActivateRenewal);

// ── Admin: list all payments (paginated) ─────────────────────────────────────
router.get('/', auth, adminOnly, getAllPayments);

// ── Get single Payment by its _id (ownership enforced in controller) ─────────
router.get('/:id', auth, getPaymentById);

module.exports = router;

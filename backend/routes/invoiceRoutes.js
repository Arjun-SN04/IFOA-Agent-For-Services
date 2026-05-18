/**
 * invoiceRoutes.js
 *
 * GET  /api/invoices/generate-number        — admin: get a fresh unique invoice number
 * GET  /api/invoices/by-payment/:paymentId  — fetch Invoice doc linked to a Payment
 * GET  /api/invoices/by-registration/:regId — fetch Invoice doc(s) for a registration
 * PATCH /api/invoices/:id/draft             — admin: save draft edits to Invoice doc
 *
 * The Invoice model is the SINGLE SOURCE OF TRUTH.
 * Every path that creates/edits an invoice writes here first;
 * Payment.invoiceDraft is kept in sync for backward compat.
 */
const express  = require('express');
const router   = express.Router();
const Invoice  = require('../models/Invoice');
const Payment  = require('../models/Payment');
const Renewal  = require('../models/Renewal');
const auth     = require('../middleware/auth');
const {
  generateInvoiceNumber,
  isInvoiceNumberTaken,
  normalizeInvoiceNumber,
} = require('../services/invoiceNumberService');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  next();
};

// ── GET /api/invoices/generate-number (admin) ────────────────────────────────
// Atomically increments the per-year counter and returns a unique number
// in the format "Invoice US-350-26". Called by the admin invoice modal on open
// so the form always shows a real DB-backed number — never a random placeholder.
router.get('/generate-number', auth, adminOnly, async (req, res) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    res.json({ success: true, invoiceNumber });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/invoices/by-payment/:paymentId ──────────────────────────────────
router.get('/by-payment/:paymentId', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ paymentId: req.params.paymentId });
    if (!invoice)
      return res.status(404).json({ success: false, message: 'Invoice not found.' });

    // Non-admin ownership check
    if (req.user.role !== 'admin') {
      const ids = [
        ...(req.user.subscriptionIds || []).map(String),
        req.user.registrationId ? String(req.user.registrationId) : null,
      ].filter(Boolean);
      if (!ids.includes(String(invoice.registrationId)))
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/invoices/by-registration/:regId ─────────────────────────────────
router.get('/by-registration/:regId', auth, async (req, res) => {
  try {
    const regId = req.params.regId;

    // Non-admin ownership check
    if (req.user.role !== 'admin') {
      const jwtIds = [
        ...(req.user.subscriptionIds || []).map(String),
        req.user.registrationId ? String(req.user.registrationId) : null,
      ].filter(Boolean);

      if (!jwtIds.includes(String(regId))) {
        let ownsReg = false;
        if (req.user.email) {
          const Airlines    = require('../models/Airlines');
          const Individual  = require('../models/Individual');
          const [airlineDoc, individualDoc] = await Promise.all([
            Airlines.findOne({ _id: regId, email: req.user.email }).select('_id').lean(),
            Individual.findOne({ _id: regId, email: req.user.email }).select('_id').lean(),
          ]);
          ownsReg = !!(airlineDoc || individualDoc);
        }
        if (!ownsReg) {
          return res.json({ success: true, data: [] });
        }
      }
    }

    // Fetch Invoice docs + Renewal docs + Payment docs (legacy invoiceDraft) in parallel.
    const [invoices, renewals, payments] = await Promise.all([
      Invoice.find({ registrationId: regId }).sort({ createdAt: -1 }).lean(),
      Renewal.find({ registrationId: regId }).sort({ createdAt: -1 }).lean(),
      Payment.find({ registrationId: regId, isPaid: true })
        .select('_id invoiceNumber invoiceDraft amountDollars paidAt paymentMethodType createdAt updatedAt purpose')
        .sort({ createdAt: -1 }).lean(),
    ]);

    // Index Invoice docs to detect duplicates across sources.
    const invoicePaymentIds = new Set(invoices.map(i => String(i.paymentId)).filter(Boolean));
    const invoiceNumbers    = new Set(invoices.map(i => i.invoiceNumber).filter(Boolean));

    // Renewal docs that have no matching Invoice doc (wire/manual renewals).
    const renewalItems = renewals
      .filter(r => {
        if (r.paymentId && invoicePaymentIds.has(String(r.paymentId))) return false;
        if (r.invoiceNumber && invoiceNumbers.has(r.invoiceNumber)) return false;
        return true;
      })
      .map(r => ({
        _id:               r._id,
        _source:           'renewal',
        invoiceNumber:     r.invoiceNumber || '',
        status:            r.status,
        totalAmount:       r.price || 0,
        createdAt:         r.createdAt,
        paidAt:            r.paidAt,
        registrationId:    r.registrationId,
        registrationModel: r.registrationModel,
        plan:              r.plan,
        activationDate:    r.activationDate,
        expiresAt:         r.expiresAt,
        draft:             null,
      }));

    // Payment docs with no canonical Invoice doc — covers legacy payments made
    // before the Invoice collection was implemented, and any gaps in createOrUpdateInvoice calls.
    const paymentItems = payments
      .filter(p => {
        // Skip if already represented by an Invoice doc (by paymentId or invoiceNumber)
        if (invoicePaymentIds.has(String(p._id))) return false;
        if (p.invoiceNumber && invoiceNumbers.has(p.invoiceNumber)) return false;
        return true;
      })
      .map(p => ({
        _id:           p._id,
        _source:       'payment',
        invoiceNumber: p.invoiceNumber || p.invoiceDraft?.invoiceNumber || '',
        totalAmount:   p.amountDollars || 0,
        createdAt:     p.createdAt,
        paidAt:        p.paidAt,
        paymentMethod: p.paymentMethodType || '',
        purpose:       p.purpose || '',
        draft:         p.invoiceDraft || null,
      }));

    const all = [...invoices, ...renewalItems, ...paymentItems]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: all });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/invoices/:id/draft (admin) ────────────────────────────────────
// Admin saves edits from the invoice editor into the canonical Invoice doc.
// Also syncs Payment.invoiceDraft for backward compatibility.
router.patch('/:id/draft', auth, adminOnly, async (req, res) => {
  try {
    const { draft, invoiceNumber } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice)
      return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const requestedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);
    if (requestedInvoiceNumber && requestedInvoiceNumber !== invoice.invoiceNumber) {
      const alreadyUsed = await isInvoiceNumberTaken(requestedInvoiceNumber, {
        excludeInvoiceId: invoice._id,
        excludePaymentId: invoice.paymentId || null,
      });
      if (alreadyUsed) {
        return res.status(400).json({
          success: false,
          message: 'Invoice number already exists. Please use a different value.',
        });
      }
      invoice.invoiceNumber = requestedInvoiceNumber;
    }

    if (draft) {
      // Always embed invoiceNumber into the draft payload so both admin and
      // user PDF generation can read it directly from the draft without a
      // separate lookup. Falls back to the invoice's own number if not set.
      invoice.draft = {
        ...draft,
        invoiceNumber: draft.invoiceNumber || invoiceNumber || invoice.invoiceNumber,
      };
    }

    invoice.adminGenerated = true;
    await invoice.save();

    // Backward-compat sync to Payment.invoiceDraft
    if (invoice.paymentId) {
      try {
        await Payment.findByIdAndUpdate(invoice.paymentId, {
          $set: {
            invoiceDraft:  invoice.draft,
            invoiceNumber: invoice.invoiceNumber,
          },
        });
      } catch (_) { /* non-critical */ }
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists. Please use a different value.',
      });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

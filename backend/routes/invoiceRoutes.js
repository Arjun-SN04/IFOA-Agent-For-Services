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
const Invoice             = require('../models/Invoice');
const Payment             = require('../models/Payment');
const Renewal             = require('../models/Renewal');
const Individual          = require('../models/Individual');
const Airlines            = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');
const auth                = require('../middleware/auth');
const {
  generateInvoiceNumber,
  peekNextInvoiceNumber,
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
// Uses peek (no counter increment) so opening + cancelling the modal does not
// burn a sequence number and leave permanent gaps. The number is only committed
// when the invoice is actually saved.
router.get('/generate-number', auth, adminOnly, async (req, res) => {
  try {
    const invoiceNumber = await peekNextInvoiceNumber();
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
    // Airline/individual requesters never see wire invoices that are still pending
    // admin approval (wirePending) — only the admin sees those.
    const invoiceQuery = req.user.role === 'admin'
      ? { registrationId: regId }
      : { registrationId: regId, wirePending: { $ne: true } };
    const [invoices, renewals, payments] = await Promise.all([
      Invoice.find(invoiceQuery).sort({ createdAt: -1 }).lean(),
      Renewal.find({ registrationId: regId }).sort({ createdAt: -1 }).lean(),
      Payment.find({ registrationId: regId, isPaid: true })
        .select('_id invoiceNumber invoiceDraft invoiceSnapshot amountDollars paidAt paymentMethodType createdAt updatedAt purpose stripePaymentIntentId')
        .sort({ createdAt: -1 }).lean(),
    ]);

    // Build paymentId → { purpose, stripePaymentIntentId } map
    const paymentMetaMap = {};
    for (const p of payments) {
      paymentMetaMap[String(p._id)] = {
        purpose:               p.purpose,
        stripePaymentIntentId: p.stripePaymentIntentId || '',
      };
    }

    // Enrich Invoice docs: inherit purpose + stripePaymentIntentId from linked Payment doc.
    for (const inv of invoices) {
      if (inv.paymentId) {
        const meta = paymentMetaMap[String(inv.paymentId)];
        if (meta) {
          if ((!inv.purpose || inv.purpose === 'payment') && meta.purpose && meta.purpose !== 'payment') {
            inv.purpose = meta.purpose;
          }
          if (!inv.stripePaymentIntentId && meta.stripePaymentIntentId) {
            inv.stripePaymentIntentId = meta.stripePaymentIntentId;
          }
        }
      }
    }

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
        _id:                    p._id,
        _source:                'payment',
        invoiceNumber:          p.invoiceNumber || p.invoiceDraft?.invoiceNumber || '',
        totalAmount:            p.amountDollars || 0,
        createdAt:              p.createdAt,
        paidAt:                 p.paidAt,
        paymentMethod:          p.paymentMethodType || '',
        purpose:                p.purpose || '',
        draft:                  p.invoiceDraft || null,
        invoiceSnapshot:        p.invoiceSnapshot || null,
        stripePaymentIntentId:  p.stripePaymentIntentId || '',
      }));

    // Filter out invoices the admin has deleted/hidden (by invoice number) so they
    // never show to the airline/individual or the admin.
    let hiddenSet = new Set();
    try {
      const RegModel = req.query.model === 'Individual' ? Individual : null;
      const regDoc = RegModel
        ? await RegModel.findById(regId).select('hiddenInvoiceNumbers').lean()
        : (await Airlines.findById(regId).select('hiddenInvoiceNumbers').lean())
          || (await Individual.findById(regId).select('hiddenInvoiceNumbers').lean());
      hiddenSet = new Set((regDoc?.hiddenInvoiceNumbers || []).map(n => normalizeInvoiceNumber(n)));
    } catch (_) { /* non-critical */ }

    const all = [...invoices, ...renewalItems, ...paymentItems]
      .filter(item => !hiddenSet.has(normalizeInvoiceNumber(item.invoiceNumber)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Return hidden numbers too so the client's synthetic fallback (built from
    // the registration's own invoiceNumber) never resurrects a deleted invoice.
    res.json({ success: true, data: all, hiddenInvoiceNumbers: [...hiddenSet] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/invoices/admin-create (admin) ──────────────────────────────────
// Creates a canonical Invoice doc for registrations that have no prior Invoice
// (e.g. wire-transfer / admin-only registrations where no payment flow ran).
// Idempotent: if an Invoice with the same invoiceNumber already exists for this
// registration it updates the draft rather than creating a duplicate.
router.post('/admin-create', auth, adminOnly, async (req, res) => {
  try {
    const { registrationId, registrationModel, draft, invoiceNumber, purpose, wirePending } = req.body;
    if (!registrationId || !registrationModel) {
      return res.status(400).json({ success: false, message: 'registrationId and registrationModel required.' });
    }

    const norm = normalizeInvoiceNumber(invoiceNumber);
    // renewal, holder-upgrade and custom invoices are additive — they must NOT reuse
    // the current-plan Invoice doc. Only match by exact invoice number; never fall back
    // to the generic adminGenerated doc, and never delete sibling Invoice docs.
    // Additive invoices get their OWN doc and must never reuse/rename/delete the
    // existing subscription invoice. Conversions (→ Unlimited) are additive: the prior
    // plan's invoice must persist alongside the new conversion invoice.
    const isAdditive = purpose === 'renewal' || purpose === 'holder-upgrade' || purpose === 'custom' || purpose === 'convert-unlimited';

    // Find any existing admin-generated Invoice doc for this registration.
    // Prefer exact match on invoiceNumber; fall back to any adminGenerated doc
    // (only for non-additive/initial invoices).
    let existing = norm
      ? await Invoice.findOne({ registrationId, invoiceNumber: norm })
      : null;
    // Additive invoices must not hijack a DIFFERENT-purpose doc that happens to carry
    // the same number (e.g. setting the wire renewal number to the base plan's number
    // would otherwise overwrite the base invoice). Treat that as a collision.
    if (existing && isAdditive && existing.purpose !== purpose) {
      return res.status(400).json({ success: false, message: 'Invoice number already exists. Please use a different value.' });
    }
    if (!existing && !isAdditive) {
      existing = await Invoice.findOne({ registrationId, adminGenerated: true, paymentId: null })
        .sort({ createdAt: -1 });
    }

    if (existing) {
      const oldExistingNum = existing.invoiceNumber;
      if (norm && norm !== oldExistingNum) {
        const takenByOther = await Invoice.findOne({
          invoiceNumber:  norm,
          registrationId: { $ne: registrationId },
        });
        if (takenByOther) {
          return res.status(400).json({ success: false, message: 'Invoice number already exists. Please use a different value.' });
        }
        // Delete any sibling admin-generated doc that already carries this number
        // (leftover duplicate from previous saves).
        await Invoice.deleteMany({
          invoiceNumber:  norm,
          registrationId,
          _id:            { $ne: existing._id },
          paymentId:      null,
        });
        existing.invoiceNumber = norm;
      }

      existing.draft = { ...draft, invoiceNumber: existing.invoiceNumber };
      existing.markModified('draft');
      existing.adminGenerated = true;
      if (purpose) existing.purpose = purpose;
      if (wirePending !== undefined) existing.wirePending = !!wirePending;
      if (draft?.lineItems?.length) {
        existing.lineItems = draft.lineItems;
        const t = draft.lineItems.reduce((s, li) => s + (Number(li.totalPrice) || 0), 0);
        existing.totalAmount = t;
        existing.subtotal    = t;
      }

      // For initial invoices only: clean up orphan admin-generated docs for this registration.
      // Renewal/upgrade invoices are additive and must not touch sibling Invoice docs.
      if (!isAdditive) {
        await Invoice.deleteMany({
          registrationId,
          _id:       { $ne: existing._id },
          adminGenerated: true,
          paymentId: null,
        });
      }

      await existing.save();

      // Sync invoiceNumber only if this is the active subscription invoice
      // (reg.invoiceNumber matches the old number, meaning reg points to this invoice).
      try {
        const regModel = existing.registrationModel === 'Individual'            ? Individual
                       : existing.registrationModel === 'AirlinesSubscription'  ? AirlinesSubscription
                       : Airlines;
        const regDoc = await regModel.findById(existing.registrationId).select('invoiceNumber').lean();
        if (!regDoc?.invoiceNumber || regDoc.invoiceNumber === oldExistingNum) {
          await regModel.findByIdAndUpdate(existing.registrationId, {
            $set: { invoiceNumber: existing.invoiceNumber },
          });
        }
      } catch (_) { /* non-critical */ }

      return res.json({ success: true, data: existing });
    }

    const lineItems = draft?.lineItems || [];
    const totalAmount = lineItems.reduce((s, li) => s + (Number(li.totalPrice) || 0), 0);
    const now = new Date();
    const payable = new Date(now); payable.setDate(payable.getDate() + 30);

    const inv = await Invoice.create({
      invoiceNumber:     norm || await generateInvoiceNumber(),
      registrationId,
      registrationModel,
      status:            'paid',
      adminGenerated:    true,
      wirePending:       !!wirePending,
      purpose:           purpose || 'payment',
      draft:             { ...draft, invoiceNumber: norm },
      issueDate:         draft?.issueDate   ? new Date(draft.issueDate)  : now,
      payableBy:         draft?.payableBy   ? new Date(draft.payableBy)  : payable,
      paidAt:            now,
      recipientName:     draft?.recipientName     || '',
      recipientCompany:  draft?.recipientCompany  || '',
      recipientContact:  draft?.recipientName     || '',
      recipientAddress1: draft?.recipientAddress1 || '',
      recipientAddress2: draft?.recipientAddress2 || '',
      recipientCountry:  draft?.recipientCountry  || '',
      paymentMethod:     draft?.paymentMethod     || '',
      lineItems,
      subtotal:    totalAmount,
      tax:         0,
      totalAmount,
      currency:    'USD',
    });

    res.json({ success: true, data: inv });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ success: false, message: 'Invoice number already exists.' });
    }
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
    // Capture old number BEFORE modifying — needed for Registration sync check below.
    const oldInvoiceNumber = invoice.invoiceNumber;

    if (requestedInvoiceNumber && requestedInvoiceNumber !== oldInvoiceNumber) {
      // Never silently steal/delete another invoice's number — if the requested number
      // is in use anywhere (this registration or another), reject so the admin picks a
      // different value. This prevents accidentally renaming an existing invoice.
      const alreadyUsed = await isInvoiceNumberTaken(requestedInvoiceNumber, {
        excludeInvoiceId:         invoice._id,
        excludePaymentId:         invoice.paymentId || null,
        excludeRegistrationId:    invoice.registrationId || null,
        excludeRegistrationModel: invoice.registrationModel || null,
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
      invoice.draft = {
        ...draft,
        invoiceNumber: draft.invoiceNumber || invoiceNumber || invoice.invoiceNumber,
      };
      invoice.markModified('draft');

      // Persist the editable dates onto the Invoice doc itself (not just the draft)
      // so they are saved in the DB and reflected wherever the doc fields are read.
      if (draft.issueDate) {
        const d = new Date(draft.issueDate);
        if (!Number.isNaN(d.getTime())) invoice.issueDate = d;
      }
      if (draft.payableBy) {
        const d = new Date(draft.payableBy);
        if (!Number.isNaN(d.getTime())) invoice.payableBy = d;
      }

      if (draft.lineItems?.length) {
        const newTotal = draft.lineItems.reduce((s, li) => s + (Number(li.totalPrice) || 0), 0);
        invoice.lineItems   = draft.lineItems;
        invoice.totalAmount = newTotal;
        invoice.subtotal    = newTotal;
      }
    }

    invoice.adminGenerated = true;
    await invoice.save();

    // Backward-compat sync to Payment.invoiceDraft
    if (invoice.paymentId) {
      try {
        await Payment.findByIdAndUpdate(invoice.paymentId, {
          $set: { invoiceDraft: invoice.draft, invoiceNumber: invoice.invoiceNumber },
        });
      } catch (_) { /* non-critical */ }
    }

    // Sync Registration doc's invoiceNumber only if this Invoice is the one the
    // Registration currently points to (i.e. it IS the active subscription invoice).
    // Renewal invoices share the same registrationId but reg.invoiceNumber points to
    // the original subscription — editing a renewal must NOT overwrite that pointer.
    try {
      const regModel = invoice.registrationModel === 'Individual'            ? Individual
                     : invoice.registrationModel === 'AirlinesSubscription'  ? AirlinesSubscription
                     : Airlines;
      const regDoc = await regModel.findById(invoice.registrationId).select('invoiceNumber').lean();
      if (!regDoc?.invoiceNumber || regDoc.invoiceNumber === oldInvoiceNumber) {
        await regModel.findByIdAndUpdate(invoice.registrationId, {
          $set: { invoiceNumber: invoice.invoiceNumber },
        });
      }
    } catch (_) { /* non-critical */ }

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

// ── DELETE /api/invoices/by-registration/:regId/:invoiceNumber (admin) ────────
// Admin deletes an invoice. The Invoice doc (if any) is removed AND the invoice
// number is recorded on the registration's hiddenInvoiceNumbers so the
// payment/renewal-derived fallback never resurfaces it. Result: gone for both
// admin and the airline/individual.
router.delete('/by-registration/:regId/:invoiceNumber', auth, adminOnly, async (req, res) => {
  try {
    const { regId } = req.params;
    const invoiceNumber = normalizeInvoiceNumber(decodeURIComponent(req.params.invoiceNumber));
    if (!invoiceNumber)
      return res.status(400).json({ success: false, message: 'invoiceNumber required.' });

    // Remove the canonical Invoice doc if it exists for this registration.
    await Invoice.deleteMany({ registrationId: regId, invoiceNumber });

    // Record the number as hidden on the registration (covers payment/renewal fallbacks).
    const RegModel = (await Airlines.findById(regId).select('_id').lean()) ? Airlines : Individual;
    await RegModel.findByIdAndUpdate(regId, {
      $addToSet: { hiddenInvoiceNumbers: invoiceNumber },
    });

    res.json({ success: true, message: 'Invoice deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/invoices/admin/all (admin) ──────────────────────────────────────
// Returns EVERY invoice generated so far, aggregated across all sources and
// de-duplicated by invoice number. The canonical Invoice doc wins; payment- and
// renewal-derived invoices (legacy / wire / manual) that have no Invoice doc are
// included so the admin truly sees everything.
router.get('/admin/all', auth, adminOnly, async (req, res) => {
  try {
    const [invoices, payments, renewals] = await Promise.all([
      Invoice.find({}).sort({ createdAt: -1 }).lean(),
      Payment.find({ isPaid: true })
        .select('_id invoiceNumber amountDollars paidAt createdAt registrationId registrationModel paymentMethodType purpose invoiceSnapshot')
        .lean(),
      Renewal.find({})
        .select('_id invoiceNumber price createdAt paidAt registrationId registrationModel plan status')
        .lean(),
    ]);

    const map = new Map();

    for (const inv of invoices) {
      const num = normalizeInvoiceNumber(inv.invoiceNumber);
      if (!num || map.has(num)) continue;
      map.set(num, {
        invoiceNumber:     num,
        invoiceId:         inv._id,
        source:            'invoice',
        registrationId:    inv.registrationId,
        registrationModel: inv.registrationModel,
        recipientName:     inv.recipientName || inv.draft?.recipientName || '',
        recipientCompany:  inv.recipientCompany || inv.draft?.recipientCompany || '',
        totalAmount:       inv.totalAmount || 0,
        status:            inv.status || '',
        purpose:           inv.purpose || 'payment',
        wirePending:       !!inv.wirePending,
        adminGenerated:    !!inv.adminGenerated,
        createdAt:         inv.createdAt,
        issueDate:         inv.issueDate,
        paidAt:            inv.paidAt,
        draft:             inv.draft || null,
      });
    }

    for (const p of payments) {
      const num = normalizeInvoiceNumber(p.invoiceNumber);
      if (!num || map.has(num)) continue;
      const snap = p.invoiceSnapshot || {};
      map.set(num, {
        invoiceNumber:     num,
        invoiceId:         null,
        source:            'payment',
        registrationId:    p.registrationId,
        registrationModel: p.registrationModel || '',
        recipientName:     snap.name || '',
        recipientCompany:  snap.airlineName || '',
        totalAmount:       p.amountDollars || 0,
        status:            'paid',
        purpose:           p.purpose || 'payment',
        wirePending:       false,
        adminGenerated:    false,
        createdAt:         p.createdAt,
        issueDate:         p.paidAt || p.createdAt,
        paidAt:            p.paidAt,
        draft:             null,
      });
    }

    for (const r of renewals) {
      const num = normalizeInvoiceNumber(r.invoiceNumber);
      if (!num || map.has(num)) continue;
      map.set(num, {
        invoiceNumber:     num,
        invoiceId:         null,
        source:            'renewal',
        registrationId:    r.registrationId,
        registrationModel: r.registrationModel || '',
        recipientName:     '',
        recipientCompany:  '',
        totalAmount:       r.price || 0,
        status:            r.status || '',
        purpose:           'renewal',
        wirePending:       false,
        adminGenerated:    false,
        createdAt:         r.createdAt,
        issueDate:         r.paidAt || r.createdAt,
        paidAt:            r.paidAt,
        draft:             null,
      });
    }

    // The active base invoice carries the registration's CURRENT payment state.
    // Invoice.status is frozen at payment time, so an admin who flips a registration's
    // Payment Status to "pending" would otherwise still see "Paid" here. Override the
    // active base invoice's status from the live registration — mirrors the invoice
    // card's basePending logic in frontend/src/utils/invoiceStatus.js.
    const rows = [...map.values()];
    const idsByModel = { Airlines: new Set(), AirlinesSubscription: new Set(), Individual: new Set() };
    for (const row of rows) {
      if (row.registrationId && idsByModel[row.registrationModel]) {
        idsByModel[row.registrationModel].add(String(row.registrationId));
      }
    }
    const regSelect = '_id invoiceNumber paymentStatus isPaid holderGroups';
    const [airRegs, airSubRegs, indRegs] = await Promise.all([
      idsByModel.Airlines.size ? Airlines.find({ _id: { $in: [...idsByModel.Airlines] } }).select(regSelect).lean() : [],
      idsByModel.AirlinesSubscription.size ? AirlinesSubscription.find({ _id: { $in: [...idsByModel.AirlinesSubscription] } }).select(regSelect).lean() : [],
      idsByModel.Individual.size ? Individual.find({ _id: { $in: [...idsByModel.Individual] } }).select(regSelect).lean() : [],
    ]);
    const regMap = new Map();
    for (const r of [...airRegs, ...airSubRegs, ...indRegs]) regMap.set(String(r._id), r);
    for (const row of rows) {
      const reg = regMap.get(String(row.registrationId));
      if (!reg) continue;
      // The active base invoice reflects the registration's live payment state.
      const isActiveBase = reg.invoiceNumber && normalizeInvoiceNumber(reg.invoiceNumber) === row.invoiceNumber;
      if (isActiveBase) {
        if (reg.paymentStatus === 'pending') row.status = 'pending';
        continue;
      }
      // A holder-upgrade invoice reflects its OWN group's live payment state.
      const grp = (reg.holderGroups || []).find(
        (g) => g.invoiceNumber && normalizeInvoiceNumber(g.invoiceNumber) === row.invoiceNumber,
      );
      if (grp && grp.paymentStatus === 'pending') row.status = 'pending';
    }

    const data = rows.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/invoices/admin/by-number/:invoiceNumber (admin) ───────────────
// Hard-deletes an invoice EVERYWHERE and FREES its number so it can be reused.
//
//  - Removes the canonical Invoice doc(s).
//  - Deletes the Payment doc(s) carrying this number outright (full delete).
//  - Deletes the Renewal doc(s) carrying this number outright.
//  - Clears the number from every registration field (invoiceNumber + nextRenewal).
//  - Pulls it from every registration's hiddenInvoiceNumbers list.
//
// After this the number is no longer "taken" anywhere, so generateInvoiceNumber()
// /peekNextInvoiceNumber() will hand it back out (lowest-free-first).
// Shared full-delete: removes every record carrying `invoiceNumber` and frees it.
async function hardDeleteInvoiceNumber(invoiceNumber) {
  const num = normalizeInvoiceNumber(invoiceNumber);
  if (!num) return;

  await Invoice.deleteMany({ invoiceNumber: num });
  await Payment.deleteMany({ invoiceNumber: num });
  await Renewal.deleteMany({ invoiceNumber: num });

  // The registration carries a MIRROR of its active invoice (invoiceNumber +
  // invoiceDraft + invoiceGenerated). The Invoice collection is the source of
  // truth, so when its doc is deleted the mirror must be invalidated too —
  // otherwise the admin table still shows "Invoice"/"edit" and the PDF rebuilds
  // the old number from the stale draft. Match on either the top-level number or
  // the number baked into the draft.
  const mirrorMatch = { $or: [{ invoiceNumber: num }, { 'invoiceDraft.invoiceNumber': num }] };
  const clearMirror = { $set: { invoiceNumber: '', invoiceDraft: null, invoiceGenerated: false } };

  await Promise.all([
    Individual.updateMany(mirrorMatch, clearMirror),
    Individual.updateMany({ 'nextRenewal.invoiceNumber': num }, { $set: { 'nextRenewal.invoiceNumber': '' } }),
    Airlines.updateMany(mirrorMatch, clearMirror),
    Airlines.updateMany({ 'nextRenewal.invoiceNumber': num }, { $set: { 'nextRenewal.invoiceNumber': '' } }),
    AirlinesSubscription.updateMany({ invoiceNumber: num }, { $set: { invoiceNumber: '' } }),
    AirlinesSubscription.updateMany({ 'nextRenewal.invoiceNumber': num }, { $set: { 'nextRenewal.invoiceNumber': '' } }),
  ]);

  await Promise.all([
    Individual.updateMany({ hiddenInvoiceNumbers: num }, { $pull: { hiddenInvoiceNumbers: num } }),
    Airlines.updateMany({ hiddenInvoiceNumbers: num }, { $pull: { hiddenInvoiceNumbers: num } }),
  ]);
}

router.delete('/admin/by-number/:invoiceNumber', auth, adminOnly, async (req, res) => {
  try {
    const invoiceNumber = normalizeInvoiceNumber(decodeURIComponent(req.params.invoiceNumber));
    if (!invoiceNumber)
      return res.status(400).json({ success: false, message: 'invoiceNumber required.' });

    await hardDeleteInvoiceNumber(invoiceNumber);
    res.json({ success: true, message: 'Invoice deleted and its number freed for reuse.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/invoices/admin/bulk-delete (admin) ──────────────────────────────
// Hard-deletes many invoices at once. Body: { invoiceNumbers: string[] }.
router.post('/admin/bulk-delete', auth, adminOnly, async (req, res) => {
  try {
    const list = Array.isArray(req.body?.invoiceNumbers) ? req.body.invoiceNumbers : [];
    const numbers = [...new Set(list.map(normalizeInvoiceNumber).filter(Boolean))];
    if (!numbers.length)
      return res.status(400).json({ success: false, message: 'invoiceNumbers array required.' });

    for (const num of numbers) {
      // eslint-disable-next-line no-await-in-loop
      await hardDeleteInvoiceNumber(num);
    }

    res.json({ success: true, deleted: numbers.length, message: `${numbers.length} invoice(s) deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

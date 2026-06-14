/**
 * invoiceService.js
 *
 * Creates and updates the canonical Invoice document.
 *
 * Called from:
 *  - paymentController.confirmPayment()   — card payment confirmed
 *  - paymentController.stripeWebhook()    — webhook backup confirm
 *  - paymentController.saveInvoiceDraft() — admin edits invoice
 *  - individualsController / airlinesController mark-paid flows
 *
 * The Invoice document is the SINGLE SOURCE OF TRUTH for invoice data.
 * Both the admin dashboard and the user SubscriptionPage fetch from it.
 */

const Invoice        = require('../models/Invoice');
const {
  generateInvoiceNumber,
  isInvoiceNumberTaken,
  normalizeInvoiceNumber,
} = require('./invoiceNumberService');

/**
 * Build a 30-days-from-now Date.
 */
function payableByDate(from) {
  const d = new Date(from || Date.now());
  d.setDate(d.getDate() + 30);
  return d;
}

/**
 * Build the `draft` object (PDF-ready payload) from a snapshot + optional overrides.
 * This is the exact shape expected by generateIFOAInvoicePDF() on the frontend.
 */
function buildDraft(invoiceDoc, overrides = {}) {
  const issueDate = (invoiceDoc.issueDate || new Date()).toISOString().slice(0, 10);
  return {
    invoiceNumber:     invoiceDoc.invoiceNumber,
    issueDate,
    payableBy:         invoiceDoc.payableBy
      ? new Date(invoiceDoc.payableBy).toISOString().slice(0, 10)
      : payableByDate(issueDate).toISOString().slice(0, 10),
    recipientCompany:  invoiceDoc.recipientCompany  || '',
    recipientName:     invoiceDoc.recipientName     || '',
    recipientContact:  invoiceDoc.recipientContact  || invoiceDoc.recipientName || '',
    recipientAddress1: invoiceDoc.recipientAddress1 || '',
    recipientAddress2: invoiceDoc.recipientAddress2 || '',
    recipientCountry:  invoiceDoc.recipientCountry  || '',
    paymentMethod:     invoiceDoc.paymentMethod     || '',
    lineItems:         invoiceDoc.lineItems || [],
    ...overrides,
  };
}

/**
 * Create or update the Invoice document for a payment.
 *
 * @param {object} opts
 * @param {string}  opts.registrationId
 * @param {string}  opts.registrationModel  'Individual' | 'Airlines' | 'AirlinesSubscription'
 * @param {string}  [opts.paymentId]        Payment._id (null for wire/manual)
 * @param {object}  opts.snapshot           invoiceSnapshot from Payment doc
 * @param {number}  opts.amountDollars
 * @param {Date}    [opts.paidAt]
 * @param {string}  [opts.paymentMethod]
 * @param {object}  [opts.draftOverrides]   admin-supplied edits to merge into draft
 * @param {boolean} [opts.adminGenerated]   true when admin explicitly generates
 * @param {string}  [opts.existingInvoiceNumber]  reuse if already generated
 *
 * @returns {Promise<Invoice>}
 */
async function createOrUpdateInvoice(opts) {
  const {
    registrationId,
    registrationModel,
    paymentId       = null,
    snapshot        = {},
    amountDollars   = 0,
    paidAt,
    paymentMethod   = '',
    draftOverrides  = null,
    adminGenerated  = false,
    existingInvoiceNumber = null,
    purpose         = 'payment',
    // Explicit line items (e.g. a conversion's Unlimited line + prorated credit line).
    // When provided they replace the auto-computed single line for BOTH the canonical
    // Invoice.lineItems and the PDF-ready draft, so the two never diverge.
    lineItems       = null,
  } = opts;

  // ── 1. Locate existing Invoice — strategy depends on how the payment was made ─
  //
  // Stripe card payments:  upsert by paymentId (idempotent per Stripe intent)
  // Wire / manual:         upsert ONLY if an Invoice with exactly this
  //                        existingInvoiceNumber already exists for this
  //                        registration — otherwise ALWAYS create a new Invoice
  //                        so every wire/renewal payment gets its own unique doc.
  let existing = null;
  if (paymentId) {
    existing = await Invoice.findOne({ paymentId });
  } else if (existingInvoiceNumber) {
    const norm = normalizeInvoiceNumber(existingInvoiceNumber);
    if (norm) {
      existing = await Invoice.findOne({ registrationId, invoiceNumber: norm });
    }
  }

  // ── 2. Determine invoice number ───────────────────────────────────────────
  let invoiceNumber = existing?.invoiceNumber || null;
  if (!invoiceNumber) {
    const preferredInvoiceNumber = normalizeInvoiceNumber(existingInvoiceNumber);
    if (preferredInvoiceNumber) {
      const preferredTaken = await isInvoiceNumberTaken(preferredInvoiceNumber, {
        excludePaymentId: paymentId || null,
        excludeInvoiceId: existing?._id || null,
        excludeRegistrationId: registrationId || null,
        excludeRegistrationModel: registrationModel || null,
      });
      invoiceNumber = preferredTaken
        ? await generateInvoiceNumber()
        : preferredInvoiceNumber;
    } else {
      invoiceNumber = await generateInvoiceNumber();
    }
  }

  // ── 3. Build the full document payload ────────────────────────────────────
  const isAirline      = registrationModel !== 'Individual';
  const holderCount    = Number(snapshot.holderCount    || 0);
  const pricePerCert   = Number(snapshot.pricePerCert   || 0);
  const multiYearCount = Number(snapshot.multiYearCount || 1);
  const yearMultiplier = snapshot.subscriptionPlan === 'Multiple Years Subscription Plan' && multiYearCount > 1
    ? multiYearCount
    : 1;
  // Trust the snapshot total first — every payment path builds it from the amount
  // actually charged (incl. admin price overrides). The ppc × count recompute is
  // only a fallback for legacy snapshots that carry no total.
  const snapshotTotal = Number(snapshot.totalPaid || snapshot.subtotal || 0);
  const totalAmount = snapshotTotal > 0
    ? snapshotTotal
    : (isAirline && pricePerCert > 0 && holderCount > 0
      ? pricePerCert * holderCount * yearMultiplier
      : amountDollars);

  const planBase  = (snapshot.subscriptionPlan || '1 Year Plan')
    .replace(' Subscription Plan', '')
    .replace(' Plan', '');
  const planLabel = snapshot.subscriptionPlan === 'Multiple Years Subscription Plan' && multiYearCount > 1
    ? `${planBase} (${multiYearCount} Years)`
    : planBase;

  const lineDescription = purpose === 'holder-upgrade'
    ? `Agent For Service - Holder Upgrade`
    : `Agent For Service - ${planLabel}`;

  // For multi-year airline plans the line total is pricePerCert × holderCount × years.
  // Fold the year multiplier into unitPrice (per-holder-for-the-full-term) so the
  // invoice arithmetic reconciles: quantity × unitPrice === totalPrice. Previously
  // unitPrice was the single-year per-cert rate, so qty × unit was off by `years`.
  const airlineUnitPrice = (pricePerCert || amountDollars) * yearMultiplier;
  const computedLineItems = Array.isArray(lineItems) && lineItems.length
    ? lineItems
    : [{
        description: lineDescription,
        quantity:    isAirline ? holderCount || 1 : 1,
        unitPrice:   isAirline ? airlineUnitPrice : amountDollars,
        totalPrice:  totalAmount,
      }];

  const issueDate  = paidAt || existing?.issueDate || new Date();
  const payableBy  = payableByDate(issueDate);

  const recipientName    = snapshot.name    || '';
  const recipientCompany = isAirline ? (snapshot.airlineName || recipientName) : '';
  const address          = snapshot.address || '';

  const docPayload = {
    invoiceNumber,
    paymentId,
    registrationId,
    registrationModel,
    status:           'paid',
    issueDate,
    payableBy,
    paidAt:           paidAt || issueDate,
    recipientName,
    recipientCompany,
    recipientContact:  recipientName,
    recipientAddress1: address,
    recipientAddress2: '',
    recipientCountry:  '',
    recipientEmail:    snapshot.email || '',
    recipientPhone:    snapshot.phone || '',
    subscriptionPlan:  snapshot.subscriptionPlan  || '',
    subscriptionDate:  snapshot.subscriptionDate  || issueDate,
    expirationDate:    snapshot.expirationDate    || null,
    isAirline,
    lineItems:   computedLineItems,
    subtotal:    totalAmount,
    tax:         0,
    totalAmount,
    currency:    'USD',
    paymentMethod,
  };

  // ── 4. Build / merge the PDF-ready draft ─────────────────────────────────
  // If admin provided overrides, merge them on top of the computed draft.
  const baseDraft = buildDraft({ ...docPayload }, {});
  docPayload.draft = draftOverrides
    ? { ...baseDraft, ...draftOverrides }
    : (existing?.draft || baseDraft);

  // Mark purpose and admin-generated flag
  docPayload.purpose = purpose;
  if (adminGenerated) docPayload.adminGenerated = true;

  // ── 5. Upsert ─────────────────────────────────────────────────────────────
  if (existing) {
    // Always update fields, but never overwrite a draft the admin deliberately set
    // unless new draftOverrides are explicitly provided.
    const updateSet = { ...docPayload };
    if (!draftOverrides && existing.draft) {
      // Keep the existing admin-edited draft intact
      delete updateSet.draft;
    }
    Object.assign(existing, updateSet);
    return existing.save();
  }

  return Invoice.create(docPayload);
}

module.exports = { createOrUpdateInvoice, buildDraft };

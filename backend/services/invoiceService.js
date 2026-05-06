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
  } = opts;

  // ── 1. Check if an Invoice already exists for this registration/payment ────
  const query = paymentId
    ? { paymentId }
    : { registrationId, registrationModel };

  let existing = await Invoice.findOne(query);

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
  const isAirline    = registrationModel !== 'Individual';
  const holderCount  = Number(snapshot.holderCount  || 0);
  const pricePerCert = Number(snapshot.pricePerCert || 0);
  const totalAmount  = isAirline && pricePerCert > 0 && holderCount > 0
    ? pricePerCert * holderCount
    : amountDollars;

  const planLabel = (snapshot.subscriptionPlan || '1 Year Plan')
    .replace(' Subscription Plan', '')
    .replace(' Plan', '');

  const lineItems = [{
    description: `Agent For Service - ${planLabel}`,
    quantity:    isAirline ? holderCount || 1 : 1,
    unitPrice:   isAirline ? pricePerCert || amountDollars : amountDollars,
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
    lineItems,
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

  // Mark as admin-generated if flagged
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

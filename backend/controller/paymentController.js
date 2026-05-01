/**
 * paymentController.js
 *
 * Handles all Stripe payment flows:
 *   POST /api/payments/create-intent          — create PaymentIntent, return clientSecret
 *   POST /api/payments/confirm                — called by frontend after Stripe succeeds;
 *                                               creates Payment record, marks subscription active
 *   POST /api/payments/webhook                — Stripe webhook (backup/authoritative confirm)
 *                                               Endpoint: https://ifoa-agent-for-services.onrender.com/api/payments/webhook
 *   PATCH /api/payments/:id/save-invoice-draft — admin saves invoice edits back to Payment doc
 *   GET  /api/payments/by-registration/:id    — fetch all Payment docs for a subscription
 *   GET  /api/payments/:id                    — fetch single Payment doc
 *   GET  /api/payments                        — admin: paginated list of all payments
 *
 * SINGLE SOURCE OF TRUTH FOR INVOICES
 * ─────────────────────────────────────
 * The Payment document is the authoritative invoice record.
 * When an admin edits an invoice the changes are saved as `invoiceDraft` on the
 * Payment doc — NOT separately on the registration record.  Both the user-facing
 * SubscriptionPage and the admin dashboard read from the same Payment doc, so
 * everyone always sees the same invoice.  If no Payment doc exists (wire-transfer
 * or legacy record) a draft can be stored on the registration via the existing
 * PUT /api/airlines/:id and PUT /api/individuals/:id endpoints, but the
 * SubscriptionPage always prefers the Payment doc when one is present.
 */

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Payment              = require('../models/Payment');
const Individual           = require('../models/Individual');
const Airlines             = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');
const Renewal              = require('../models/Renewal');
const { generateInvoiceNumber } = require('../services/invoiceNumberService');
const { createOrUpdateInvoice } = require('../services/invoiceService');
const {
  sendIndividualPaymentConfirmation,
  sendAirlinePaymentConfirmation,
  sendIndividualRenewalConfirmation,
  sendAirlineRenewalConfirmation,
} = require('../services/emailService');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function findRegistration(registrationId, registrationModel) {
  try {
    if (registrationModel === 'Individual') {
      const doc = await Individual.findById(registrationId);
      return { doc: doc || null, Model: Individual };
    }
    if (registrationModel === 'Airlines') {
      const doc = await Airlines.findById(registrationId);
      if (doc) return { doc, Model: Airlines };
      const legacy = await AirlinesSubscription.findById(registrationId);
      return { doc: legacy || null, Model: legacy ? AirlinesSubscription : null };
    }
    if (registrationModel === 'AirlinesSubscription') {
      const doc = await AirlinesSubscription.findById(registrationId);
      return { doc: doc || null, Model: AirlinesSubscription };
    }
    return { doc: null, Model: null };
  } catch {
    return { doc: null, Model: null };
  }
}

// ─── Airline pricing tiers (mirrors airlinesController.js constants) ─────────
const ONE_YEAR_PRICES  = { '3 to 5': 60, '5 to 10': 55, 'More than 10': 49 };
const UNLIMITED_PRICES = { '3 to 5': 265, '5 to 10': 255, 'More than 10': 245 };

function holderRangeFromCount(count) {
  if (count <= 5)  return '3 to 5';
  if (count <= 10) return '5 to 10';
  return 'More than 10';
}

function tierPpcForPlan(plan, count) {
  const range = holderRangeFromCount(count);
  return plan === 'Unlimited Plan' ? UNLIMITED_PRICES[range] : ONE_YEAR_PRICES[range];
}

function computeExpiry(subscriptionPlan, fromDate, multiYearCount) {
  const d = new Date(fromDate);
  if (subscriptionPlan === '1 Year Subscription Plan') {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if (subscriptionPlan === 'Multiple Years Subscription Plan') {
    const years = (multiYearCount && multiYearCount > 1) ? multiYearCount : 3;
    d.setFullYear(d.getFullYear() + years);
    return d;
  }
  return null; // Unlimited Plan — no expiry
}

/**
 * Build the invoice snapshot stored permanently on the Payment document.
 * For airlines the total is ALWAYS pricePerCert × committedCount so legacy
 * DB records with the old flat-rate bug are corrected at payment-confirm time.
 */
function buildInvoiceSnapshot(rec, registrationModel, amountDollars, paidAt) {
  const isAirline      = registrationModel !== 'Individual';
  const expirationDate = computeExpiry(rec.subscriptionPlan, paidAt, rec.multiYearCount);

  // Airline total: always recompute from price × count to avoid legacy bug
  const pricePerCert = Number(rec.pricePerCertificate || rec.pricePerCert || 0);
  const holderCount  = Number(
    rec.committedCount || rec.holderCountValue || rec.certificateHolders?.length || 0
  );

  let correctTotal = amountDollars;
  if (isAirline) {
    // Airline total: recompute from pricePerCert × committedCount (× years for multi-year).
    if (pricePerCert > 0 && holderCount > 0) {
      if (rec.subscriptionPlan === 'Multiple Years Subscription Plan' && rec.multiYearCount > 1) {
        correctTotal = pricePerCert * holderCount * Number(rec.multiYearCount);
      } else {
        correctTotal = pricePerCert * holderCount;
      }
    }
  }

  return {
    name: isAirline
      ? (rec.airlineName ||
         [rec.contactFirstName, rec.contactLastName].filter(Boolean).join(' ') ||
         [rec.firstName, rec.lastName].filter(Boolean).join(' ') ||
         '')
      : [rec.firstName, rec.lastName].filter(Boolean).join(' '),
    email:   rec.email || rec.contactEmail || rec.paymentEmail || '',
    phone:   rec.phone || rec.contactPhone || '',
    address: [rec.addressLine1, rec.city, rec.state, rec.postalCode, rec.country]
               .filter(Boolean).join(', '),
    isAirline,
    airlineName: rec.airlineName || '',

    subscriptionPlan: rec.subscriptionPlan || '',
    subscriptionDate: paidAt,
    expirationDate:   expirationDate || null,

    primaryCertificate:   rec.primaryCertificate   || '',
    faaCertificateNumber: rec.faaCertificateNumber  || '',
    iacraTrackingNumber:  rec.iacraTrackingNumber   || '',

    holderCount,
    pricePerCert,

    subtotal:  correctTotal,
    tax:       0,
    totalPaid: correctTotal,
  };
}

/**
 * applyRenewalToRegistration
 *
 * Called after a renewal payment succeeds.
 *
 * QUEUED (current plan still active):
 *   - Creates a Renewal doc, stores nextRenewalId + nextRenewal snapshot.
 *   - Does NOT touch expirationDate / subscriptionPlan — those stay as-is
 *     so the main subscription card always reflects what is live today.
 *
 * IMMEDIATE (plan already expired):
 *   - Activates the renewal immediately: updates expirationDate, plan, etc.
 *   - Creates a Renewal doc with status='active'.
 */
async function applyRenewalToRegistration(registrationId, registrationModel, paymentDoc) {
  const { doc, Model } = await findRegistration(registrationId, registrationModel);
  if (!doc || !Model) return null;

  // Plan selected at renewal time (may differ from current plan)
  const newPlan    = paymentDoc.newSubscriptionPlan || null;
  const activePlan = newPlan || doc.subscriptionPlan;

  const now           = new Date();
  const currentExpiry = doc.expirationDate ? new Date(doc.expirationDate) : null;

  // Base = current expiry when future (queued); today when already expired (immediate).
  const base    = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const isQueued = currentExpiry && currentExpiry > now;

  // Holder count: from Payment doc (user-adjusted at renewal) > original doc
  const renewalExactCount = paymentDoc.renewalExactCount
    ? Number(paymentDoc.renewalExactCount)
    : null;
  const effectiveCount = renewalExactCount ||
    Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 1);

  // Year count: from Payment doc (user-selected at renewal) > original doc > derive from amount
  const ppc = Number(doc.pricePerCertificate || doc.pricePerCert || 0);
  const pricePerYear = registrationModel === 'Individual'
    ? 55
    : (ppc * effectiveCount) || 55;
  const derivedYears = paymentDoc.amountDollars && pricePerYear > 0
    ? Math.max(2, Math.round(paymentDoc.amountDollars / pricePerYear))
    : null;
  const renewalMultiYearCount = paymentDoc.renewalMultiYearCount
    || (activePlan === 'Multiple Years Subscription Plan' ? derivedYears : null)
    || null;

  const newExpiry = computeExpiry(activePlan, base, renewalMultiYearCount);

  // ── If there's already a queued renewal, mark it superseded ─────────────────
  if (doc.nextRenewalId) {
    await Renewal.findByIdAndUpdate(doc.nextRenewalId, { $set: { status: 'superseded' } });
  }

  // ── Create authoritative Renewal document ───────────────────────────────────
  const renewalDoc = await Renewal.create({
    registrationId,
    registrationModel,
    paymentId:      paymentDoc._id,
    invoiceNumber:  paymentDoc.invoiceNumber || '',
    plan:           activePlan,
    multiYearCount: renewalMultiYearCount || null,
    committedCount: renewalExactCount || null,  // airline: holder count at renewal time
    price:          paymentDoc.amountDollars || 0,
    paidAt:         paymentDoc.paidAt || now,
    activationDate: base,
    expiresAt:      newExpiry || null,
    status:         isQueued ? 'queued' : 'active',
  });

  // ── Build the embedded snapshot for fast dashboard display ───────────────────
  const renewalSnapshot = {
    plan:           activePlan,
    multiYearCount: renewalMultiYearCount || null,
    committedCount: renewalExactCount || null,  // airline: user-selected count
    paidAt:         paymentDoc.paidAt || now,
    activationDate: base,
    expiresAt:      newExpiry || null,
    price:          paymentDoc.amountDollars || null,
    invoiceNumber:  paymentDoc.invoiceNumber || null,
  };

  const update = {
    expiryReminder60SentAt: null,
    expiryReminder30SentAt: null,
    lastRenewal:             renewalSnapshot,  // always kept as payment-history
  };

  if (isQueued) {
    // QUEUED — do NOT touch expirationDate / subscriptionPlan / invoiceNumber.
    // The current subscription remains unchanged until admin or auto-activates.
    update.nextRenewalId = renewalDoc._id;
    update.nextRenewal   = renewalSnapshot;
  } else {
    // IMMEDIATE — plan was expired; activate the renewal right away.
    // subscriptionDate = base (= now for expired plans) so the date shown
    // to the user is when coverage actually resumed, not a future queued date.
    update.subscriptionPlan        = activePlan;
    update.subscriptionDate        = base;
    if (newExpiry)  update.expirationDate        = newExpiry;
    update.invoiceNumber           = paymentDoc.invoiceNumber;
    update.stripePaymentIntentId   = paymentDoc.stripePaymentIntentId;
    update.paymentStatus           = 'paid';
    update.isPaid                  = true;
    update.status                  = 'Active';
    update.isFormCompleted         = true;
    // nextRenewal/nextRenewalId cleared via $unset below — do NOT put them in $set
    if (renewalMultiYearCount)     update.multiYearCount = renewalMultiYearCount;
    // Airline: update committed holder count if user changed it at renewal time
    if (renewalExactCount && registrationModel !== 'Individual') {
      update.committedCount    = renewalExactCount;
      update.holderCountValue  = String(renewalExactCount);
      update.holderCount       = holderRangeFromCount(renewalExactCount);
    }
    if (registrationModel === 'Individual') {
      const PLAN_PRICES = { '1 Year Subscription Plan': 69, 'Unlimited Plan': 299 };
      if (PLAN_PRICES[activePlan] !== undefined) update.price = PLAN_PRICES[activePlan];
      else if (activePlan === 'Multiple Years Subscription Plan' && renewalMultiYearCount) {
        update.price = 55 * renewalMultiYearCount;
      }
    }
  }

  if (registrationModel !== 'Individual') {
    update.wirePaymentRequested   = false;
    update.wirePaymentRequestedAt = null;
  }

  // For IMMEDIATE activations: null out nextRenewal fields explicitly.
  // $unset on a typed subdocument leaves an empty shell — nulling each field
  // ensures frontend checks like nextRenewal.paidAt correctly return falsy.
  const mongoOp = isQueued
    ? { $set: update }
    : {
        $set: {
          ...update,
          'nextRenewal.paidAt':         null,
          'nextRenewal.plan':           null,
          'nextRenewal.activationDate': null,
          'nextRenewal.expiresAt':      null,
          'nextRenewal.invoiceNumber':  null,
          'nextRenewal.price':          null,
        },
        $unset: { nextRenewalId: 1 },
      };

  return Model.findByIdAndUpdate(registrationId, mongoOp, { new: true });
}

async function applyPaymentToRegistration(registrationId, registrationModel, paymentDoc) {
  const { doc, Model } = await findRegistration(registrationId, registrationModel);
  if (!doc || !Model) return null;

  const now = paymentDoc.paidAt || new Date();
  const expirationDate = computeExpiry(doc.subscriptionPlan, now, doc.multiYearCount);

  const update = {
    paymentStatus:         'paid',
    isPaid:                true,
    isFormCompleted:       true,
    status:                'Active',
    subscriptionDate:      now,
    invoiceStatus:         'Paid',
    invoiceNumber:         paymentDoc.invoiceNumber,
    stripePaymentIntentId: paymentDoc.stripePaymentIntentId,
    paymentId:             paymentDoc._id,
  };
  if (expirationDate) update.expirationDate = expirationDate;

  if (registrationModel !== 'Individual') {
    update.amountPaid = paymentDoc.invoiceSnapshot?.totalPaid || paymentDoc.amountDollars || 0;
    update.wirePaymentRequested = false;
    update.wirePaymentRequestedAt = null;
  }

  return Model.findByIdAndUpdate(registrationId, { $set: update }, { new: true });
}

// ─── POST /api/payments/create-intent ────────────────────────────────────────
exports.createPaymentIntent = async (req, res) => {
  try {
    const {
      registrationId,
      registrationModel,
      purpose = 'payment',
      newSubscriptionPlan,        // optional: plan user selected at renewal time
      renewalMultiYearCount: bodyRenewalYears,  // optional: years user selected (Multi-Year renewal)
      renewalExactCount: bodyRenewalCount,       // optional: holder count user selected (airline renewal)
      additionalHolderCount: bodyAdditionalCount, // optional: extra holders being added (holder-upgrade)
    } = req.body;

    if (!registrationId || !registrationModel)
      return res.status(400).json({
        success: false,
        message: 'registrationId and registrationModel are required.',
      });

    const VALID_MODELS = ['Individual', 'Airlines', 'AirlinesSubscription'];
    if (!VALID_MODELS.includes(registrationModel))
      return res.status(400).json({ success: false, message: 'Invalid registrationModel.' });

    const VALID_PURPOSES = ['payment', 'renewal', 'holder-upgrade'];
    if (!VALID_PURPOSES.includes(purpose))
      return res.status(400).json({ success: false, message: 'Invalid purpose.' });

    const { doc } = await findRegistration(registrationId, registrationModel);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Registration record not found.' });

    // ── Ownership check ───────────────────────────────────────────────────────
    // Non-admins can only create intents for registrations they own.
    if (req.user.role !== 'admin') {
      const userSubIds = (req.user.subscriptionIds || []).map(String);
      const userRegId  = req.user.registrationId ? String(req.user.registrationId) : null;
      const userEmail  = (req.user.email || '').toLowerCase();
      const docEmail   = (doc.email || doc.pointOfContactEmail || '').toLowerCase();
      const owns = userRegId === String(registrationId)
        || userSubIds.includes(String(registrationId))
        || (userEmail && docEmail && userEmail === docEmail);
      if (!owns)
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Renewals and holder-upgrades are allowed even when already paid; block only for first-time payments
    if (purpose !== 'renewal' && purpose !== 'holder-upgrade' && (doc.isPaid || doc.paymentStatus === 'paid'))
      return res.status(400).json({
        success: false,
        message: 'This subscription is already paid.',
      });

    // Guard: cannot renew an Unlimited Plan (it never expires)
    if (purpose === 'renewal' && doc.subscriptionPlan === 'Unlimited Plan' && !newSubscriptionPlan) {
      return res.status(400).json({
        success: false,
        message: 'Unlimited Plan subscriptions do not require renewal.',
      });
    }

    // Guard: holder-upgrade only applies to airlines
    if (purpose === 'holder-upgrade' && registrationModel === 'Individual') {
      return res.status(400).json({
        success: false,
        message: 'Holder upgrades are only available for airline accounts.',
      });
    }

    // ── Determine amount ──────────────────────────────────────────────────────
    let amountDollars;

    // ── Holder upgrade: count-based charge for additional slots ─────────────────
    if (purpose === 'holder-upgrade') {
      const additional = Number(bodyAdditionalCount || 0);
      if (!additional || additional < 1)
        return res.status(400).json({ success: false, message: 'additionalHolderCount must be at least 1 for airline accounts.' });

      // Determine new total count and look up tier-based ppc
      const currentCommitted = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
      const newTotal = Math.max(3, currentCommitted + additional);
      const newPpc   = tierPpcForPlan(doc.subscriptionPlan, newTotal);

      // Count-based holder-upgrade amount: tier price x added holders.
      amountDollars = newPpc * additional;
    } else if (registrationModel !== 'Individual') {
      // Airlines: compute from pricePerCert × holder count (use renewal count if provided)
      const ppc = Number(doc.pricePerCertificate || doc.pricePerCert || 0);
      // For renewals the user may have adjusted the holder count — use that if supplied.
      const renewalCount = bodyRenewalCount ? Number(bodyRenewalCount) : null;
      const count = renewalCount ||
        Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
      if (ppc > 0 && count > 0) {
        const activePlanForAirline = newSubscriptionPlan || doc.subscriptionPlan;
        if (activePlanForAirline === 'Multiple Years Subscription Plan') {
          const renewalYears = bodyRenewalYears ? Number(bodyRenewalYears) : (doc.multiYearCount || 3);
          amountDollars = ppc * count * Math.max(2, renewalYears);
        } else {
          amountDollars = ppc * count;  // 1 Year or Unlimited
        }
      } else {
        amountDollars = Number(doc.totalAmount || doc.totalServiceFees || 0);
      }
    } else {
      // Individual: use the renewal-selected plan and year count (or original doc values)
      const activePlan  = newSubscriptionPlan || doc.subscriptionPlan;
      // renewalYears: user-supplied at renewal time > original doc value > default 3
      const renewalYears = bodyRenewalYears
        ? Number(bodyRenewalYears)
        : (doc.multiYearCount || 3);
      const INDIVIDUAL_PLAN_PRICES = {
        '1 Year Subscription Plan':        69,
        'Multiple Years Subscription Plan': 55 * Math.max(2, renewalYears),
        'Unlimited Plan':                  299,
      };
      if (INDIVIDUAL_PLAN_PRICES[activePlan] !== undefined) {
        amountDollars = INDIVIDUAL_PLAN_PRICES[activePlan];
      } else {
        amountDollars = Number(doc.price || doc.totalAmount || 0);
      }
    }

    const amountCents = Math.round(amountDollars * 100);

    // Validate amount — must be positive. Stripe requires minimum $0.50.
    if (amountCents <= 0)
      return res.status(400).json({ success: false, message: 'Invalid payment amount computed. Please check subscription configuration.' });
    if (amountCents < 50)
      return res.status(400).json({ success: false, message: `Payment amount too small ($${amountDollars.toFixed(2)}). Minimum is $0.50.` });

    const metadata = {
      registrationId:    String(registrationId),
      registrationModel,
      purpose,
    };
    // Store new plan in metadata so webhook/confirm can apply plan change
    if (newSubscriptionPlan) metadata.newSubscriptionPlan = newSubscriptionPlan;
    // Store the RENEWAL-selected year count (NOT the original doc's count)
    const metaRenewalYears = bodyRenewalYears ? Number(bodyRenewalYears) : (doc.multiYearCount || null);
    if (metaRenewalYears) metadata.renewalMultiYearCount = String(metaRenewalYears);
    // Store the RENEWAL-selected holder count for airline renewals
    if (bodyRenewalCount) metadata.renewalExactCount = String(Number(bodyRenewalCount));
    // Store additional holder count for holder-upgrade purpose
    if (bodyAdditionalCount) metadata.additionalHolderCount = String(Number(bodyAdditionalCount));
    // Store tier ppc so confirm/webhook can update pricePerCertificate on the record
    if (purpose === 'holder-upgrade') {
      const _additional = Number(bodyAdditionalCount || 0);
      const _current    = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
      const _newTotal   = Math.max(3, _current + _additional);
      metadata.newPricePerCertificate = String(tierPpcForPlan(doc.subscriptionPlan, _newTotal));
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: 'usd',
      payment_method_types: ['card'],
      description: `Subscription — ${registrationModel} ${registrationId}`,
      metadata,
    });

    res.json({
      success:         true,
      clientSecret:    paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount:          amountCents,
      currency:        'usd',
    });
  } catch (err) {
    console.error('[createPaymentIntent]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── POST /api/payments/confirm ───────────────────────────────────────────────
exports.confirmPayment = async (req, res) => {
  try {
    const {
      paymentIntentId,
      registrationId,
      registrationModel,
      ipAddress,
      userAgent,
    } = req.body;

    if (!paymentIntentId || !registrationId || !registrationModel)
      return res.status(400).json({
        success: false,
        message: 'paymentIntentId, registrationId, and registrationModel are required.',
      });

    const existing = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (existing && existing.isPaid) {
      return res.json({ success: true, payment: existing, alreadyRecorded: true });
    }

    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeErr) {
      return res.status(400).json({
        success: false,
        message: `Stripe error: ${stripeErr.message}`,
      });
    }

    if (pi.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Stripe status: ${pi.status}`,
      });
    }

    // Security: verify that the registrationId in the request matches what Stripe has
    if (pi.metadata?.registrationId && pi.metadata.registrationId !== String(registrationId)) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent does not match the provided registration.',
      });
    }

    const { doc } = await findRegistration(registrationId, registrationModel);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Registration record not found.' });

    // ── Ownership check ───────────────────────────────────────────────────────
    if (req.user.role !== 'admin') {
      const userSubIds = (req.user.subscriptionIds || []).map(String);
      const userRegId  = req.user.registrationId ? String(req.user.registrationId) : null;
      const userEmail  = (req.user.email || '').toLowerCase();
      const docEmail   = (doc.email || doc.pointOfContactEmail || '').toLowerCase();
      const owns = userRegId === String(registrationId)
        || userSubIds.includes(String(registrationId))
        || (userEmail && docEmail && userEmail === docEmail);
      if (!owns)
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const now              = new Date();
    const amountCents      = pi.amount_received || pi.amount;
    const amountDollars    = amountCents / 100;

    // ── Determine purpose early so invoice number and snapshot are correct ────
    const piPurpose = pi.metadata?.purpose || 'payment';
    const isPurposeRenewal = piPurpose === 'renewal';
    const isPurposeHolderUpgrade = piPurpose === 'holder-upgrade';

    // Renewals always get a fresh invoice number so it doesn't overlap with
    // the original subscription's invoice.
    const invoiceNum = isPurposeRenewal
      ? await generateInvoiceNumber()
      : (doc.invoiceNumber || await generateInvoiceNumber());

    let last4 = '', cardBrand = '', paymentMethodType = '', stripeChargeId = '', stripeCustomerId = '';
    try {
      if (pi.latest_charge) {
        const charge     = await stripe.charges.retrieve(pi.latest_charge);
        stripeChargeId   = charge.id    || '';
        stripeCustomerId = typeof charge.customer === 'string' ? charge.customer : '';
        const pm = charge.payment_method_details;
        if (pm?.type === 'card') {
          last4             = pm.card?.last4  || '';
          cardBrand         = pm.card?.brand  || '';
          paymentMethodType = 'card';
        } else {
          paymentMethodType = pm?.type || '';
        }
      }
    } catch (chargeErr) {
      console.warn('[confirmPayment] Charge retrieval failed (non-critical):', chargeErr.message);
    }

    // ── Build invoice snapshot ────────────────────────────────────────────────
    // For renewals: snapshot must show the RENEWED period (activationDate→newExpiry),
    // not today→today+plan (which is what a plain buildInvoiceSnapshot would produce).
    const renewalMultiYearCount = pi.metadata?.renewalMultiYearCount
      ? Number(pi.metadata.renewalMultiYearCount)
      : null;
    const renewalExactCount = pi.metadata?.renewalExactCount
      ? Number(pi.metadata.renewalExactCount)
      : null;

    let invoiceSnapshot;
    if (isPurposeRenewal) {
      const renewalPlan      = pi.metadata?.newSubscriptionPlan || doc.subscriptionPlan;
      const renewalYears     = renewalMultiYearCount || doc.multiYearCount || null;
      const currentExpiry    = doc.expirationDate ? new Date(doc.expirationDate) : null;
      const renewalBase      = (currentExpiry && currentExpiry > now) ? currentExpiry : now;
      // Build snapshot as if subscription starts on renewalBase (not paidAt=now).
      // Override committedCount with the user-adjusted holder count for airlines.
      const renewalDocObj = {
        ...doc.toObject(),
        subscriptionPlan: renewalPlan,
        multiYearCount:   renewalYears,
        ...(renewalExactCount ? { committedCount: renewalExactCount, holderCountValue: renewalExactCount } : {}),
      };
      invoiceSnapshot = buildInvoiceSnapshot(renewalDocObj, registrationModel, amountDollars, renewalBase);
    } else {
      invoiceSnapshot = buildInvoiceSnapshot(doc, registrationModel, amountDollars, now);
    }

    const paymentData = {
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId,
      stripeCustomerId,
      paymentMethodType,
      last4,
      cardBrand,
      status:           'succeeded',
      isPaid:           true,
      paidAt:           now,
      amountCents,
      // Store the corrected amount (pricePerCert × count) not the raw Stripe amount
      // so the invoice always shows the right total even for legacy records.
      amountDollars:    invoiceSnapshot.totalPaid || amountDollars,
      currency:         pi.currency || 'usd',
      registrationId,
      registrationModel,
      invoiceNumber:    invoiceNum,
      invoiceSnapshot,
      // invoiceDraft starts as null — admin populates it via save-invoice-draft
      invoiceDraft:        null,
      description:         pi.description || '',
      ipAddress:           ipAddress || req.ip || '',
      userAgent:           userAgent || req.headers['user-agent'] || '',
      confirmedVia:        'frontend',
      // Renewal metadata — persisted on Payment doc for use by applyRenewalToRegistration
      purpose:                isPurposeRenewal ? 'renewal' : isPurposeHolderUpgrade ? 'holder-upgrade' : 'payment',
      newSubscriptionPlan:    pi.metadata?.newSubscriptionPlan || null,
      renewalMultiYearCount,
      renewalExactCount,
    };

    // Use findOneAndUpdate with upsert to prevent duplicate Payment docs under
    // concurrent requests (race condition guard — unique index on stripePaymentIntentId
    // is the last line of defence but this avoids relying on error handling alone).
    let paymentDoc;
    try {
      paymentDoc = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        { $setOnInsert: paymentData },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        // Duplicate key — another request already created it; return existing
        paymentDoc = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
        if (paymentDoc && paymentDoc.isPaid) {
          return res.json({ success: true, payment: paymentDoc, alreadyRecorded: true });
        }
      } else {
        throw dupErr;
      }
    }

    // If the doc already existed and was not yet marked paid, update it fully
    if (paymentDoc && !paymentDoc.isPaid) {
      Object.assign(paymentDoc, paymentData);
      paymentDoc = await paymentDoc.save();
    }

    let updatedReg;
    if (isPurposeRenewal) {
      updatedReg = await applyRenewalToRegistration(registrationId, registrationModel, paymentDoc);
    } else if (isPurposeHolderUpgrade) {
      // Increase committedCount by the additional holder count that was paid for
      // and update pricePerCertificate to the new tier rate.
      const additionalCount = Number(pi.metadata?.additionalHolderCount || 0);
      if (additionalCount > 0) {
        const { doc: freshDoc, Model: freshModel } = await findRegistration(registrationId, registrationModel);
        if (freshDoc && freshModel) {
          const currentCommitted = Number(freshDoc.committedCount || freshDoc.holderCountValue || freshDoc.certificateHolders?.length || 0);
          const newCount  = currentCommitted + additionalCount;
          // Use the tier ppc stored in metadata (computed at create-intent time) or recompute it.
          const newPpc    = pi.metadata?.newPricePerCertificate
            ? Number(pi.metadata.newPricePerCertificate)
            : tierPpcForPlan(freshDoc.subscriptionPlan, newCount);
          updatedReg = await freshModel.findByIdAndUpdate(
            registrationId,
            { $set: {
                committedCount:        newCount,
                holderCountValue:      String(newCount),
                pricePerCertificate:   newPpc,
              }
            },
            { new: true }
          );
        }
      } else {
        updatedReg = doc;
      }
    } else {
      updatedReg = await applyPaymentToRegistration(registrationId, registrationModel, paymentDoc);
    }

    // Create / update the canonical Invoice document (single source of truth).
    // This is what both the admin dashboard and the user SubscriptionPage read.
    try {
      await createOrUpdateInvoice({
        registrationId,
        registrationModel,
        paymentId:      paymentDoc._id,
        snapshot:       paymentDoc.invoiceSnapshot || {},
        amountDollars:  paymentDoc.amountDollars,
        paidAt:         paymentDoc.paidAt,
        paymentMethod:  paymentDoc.paymentMethodType || 'card',
        existingInvoiceNumber: paymentDoc.invoiceNumber,
      });
    } catch (invoiceErr) {
      // Non-critical — log but don't fail the payment response
      console.warn('[confirmPayment] Invoice doc creation failed:', invoiceErr.message);
    }

    console.log(`[confirmPayment] Payment ${paymentDoc._id} confirmed for ${registrationModel} ${registrationId}`);

    res.json({
      success:      true,
      payment:      paymentDoc,
      registration: updatedReg,
    });

    // Send confirmation email (non-blocking).
    // Renewals get a different template than first-time payments.
    if (updatedReg) {
      const sendFn = isPurposeRenewal
        ? (registrationModel === 'Individual' ? sendIndividualRenewalConfirmation : sendAirlineRenewalConfirmation)
        : (registrationModel === 'Individual' ? sendIndividualPaymentConfirmation : sendAirlinePaymentConfirmation);
      sendFn(updatedReg, req.user?.email).catch((e) =>
        console.warn('[confirmPayment] Email failed:', e.message)
      );
    }
  } catch (err) {
    console.error('[confirmPayment]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── PATCH /api/payments/:id/save-invoice-draft ───────────────────────────────
/**
 * Admin saves edited invoice fields back to the Payment document.
 * This is the single source of truth — both the admin dashboard and the
 * airline/individual subscription page read `invoiceDraft` from the same
 * Payment doc, so they always see the same invoice.
 */
exports.saveInvoiceDraft = async (req, res) => {
  try {
    const { invoiceDraft, invoiceNumber } = req.body;

    const update = {};
    if (invoiceDraft !== undefined) update.invoiceDraft = invoiceDraft;
    if (invoiceNumber)              update.invoiceNumber = invoiceNumber;

    const paymentDoc = await Payment.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true },
    );

    if (!paymentDoc)
      return res.status(404).json({ success: false, message: 'Payment record not found.' });

    // Sync invoiceNumber + invoiceDraft back to the registration record.
    if (paymentDoc.registrationId && paymentDoc.registrationModel) {
      try {
        const { doc, Model } = await findRegistration(
          paymentDoc.registrationId,
          paymentDoc.registrationModel,
        );
        if (doc && Model) {
          await Model.findByIdAndUpdate(paymentDoc.registrationId, {
            $set: {
              invoiceNumber,
              invoiceGenerated: true,
              invoiceDraft: invoiceDraft || doc.invoiceDraft || null,
            },
          });
        }
      } catch (_) { /* Non-critical */ }
    }

    // Also update (or create) the canonical Invoice document so the user
    // SubscriptionPage always sees the same invoice the admin just saved.
    try {
      const Invoice = require('../models/Invoice');
      const existingInvoice = await Invoice.findOne({ paymentId: paymentDoc._id });
      if (existingInvoice) {
        if (invoiceDraft)  existingInvoice.draft         = invoiceDraft;
        if (invoiceNumber) existingInvoice.invoiceNumber  = invoiceNumber;
        existingInvoice.adminGenerated = true;
        await existingInvoice.save();
      } else if (paymentDoc.registrationId && paymentDoc.registrationModel) {
        // No Invoice doc yet (e.g. wire payment) — create one now.
        await createOrUpdateInvoice({
          registrationId:        paymentDoc.registrationId,
          registrationModel:     paymentDoc.registrationModel,
          paymentId:             paymentDoc._id,
          snapshot:              paymentDoc.invoiceSnapshot || {},
          amountDollars:         paymentDoc.amountDollars || 0,
          paidAt:                paymentDoc.paidAt || new Date(),
          paymentMethod:         paymentDoc.paymentMethodType || '',
          draftOverrides:        invoiceDraft || null,
          adminGenerated:        true,
          existingInvoiceNumber: invoiceNumber || paymentDoc.invoiceNumber,
        });
      }
    } catch (invErr) {
      console.warn('[saveInvoiceDraft] Invoice doc sync failed:', invErr.message);
    }

    res.json({ success: true, data: paymentDoc });
  } catch (err) {
    console.error('[saveInvoiceDraft]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Endpoint: https://ifoa-agent-for-services.onrender.com/api/payments/webhook
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('[stripeWebhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const { registrationId, registrationModel, newSubscriptionPlan } = pi.metadata || {};

    if (!registrationId || !registrationModel) {
      console.warn('[stripeWebhook] Missing metadata on PaymentIntent:', pi.id);
      return res.json({ received: true });
    }

    try {
      const existing = await Payment.findOne({ stripePaymentIntentId: pi.id });
      if (existing && existing.isPaid) {
        console.log(`[stripeWebhook] Already recorded: ${pi.id}`);
        return res.json({ received: true });
      }

      const { doc } = await findRegistration(registrationId, registrationModel);
      if (!doc) {
        console.error(`[stripeWebhook] Registration not found: ${registrationModel} ${registrationId}`);
        return res.json({ received: true });
      }

      const now              = new Date();
      const amountCents      = pi.amount_received || pi.amount;
      const amountDollars    = amountCents / 100;
      const webhookPurpose = pi.metadata?.purpose || 'payment';
      const isPurposeRenewal = webhookPurpose === 'renewal';
      const isPurposeHolderUpgradeWebhook = webhookPurpose === 'holder-upgrade';

      // Renewals always get a fresh invoice number.
      // But if the frontend already confirmed and created an invoice number, reuse it
      // to avoid duplicate invoices for the same payment.
      const invoiceNum = isPurposeRenewal
        ? (existing?.invoiceNumber || await generateInvoiceNumber())
        : (existing?.invoiceNumber || doc.invoiceNumber || await generateInvoiceNumber());

      let last4 = '', cardBrand = '', paymentMethodType = '', stripeChargeId = '', stripeCustomerId = '';
      try {
        if (pi.latest_charge) {
          const charge     = await stripe.charges.retrieve(pi.latest_charge);
          stripeChargeId   = charge.id    || '';
          stripeCustomerId = typeof charge.customer === 'string' ? charge.customer : '';
          const pm = charge.payment_method_details;
          if (pm?.type === 'card') {
            last4             = pm.card?.last4 || '';
            cardBrand         = pm.card?.brand || '';
            paymentMethodType = 'card';
          } else {
            paymentMethodType = pm?.type || '';
          }
        }
      } catch (chargeErr) {
        console.warn('[stripeWebhook] Charge retrieval failed (non-critical):', chargeErr.message);
      }

      // Build invoice snapshot — for renewals use activationDate as period start
      const webhookRenewalYears = pi.metadata?.renewalMultiYearCount
        ? Number(pi.metadata.renewalMultiYearCount) : null;
      const webhookRenewalCount = pi.metadata?.renewalExactCount
        ? Number(pi.metadata.renewalExactCount) : null;

      let invoiceSnapshot;
      if (isPurposeRenewal) {
        const renewalPlan   = pi.metadata?.newSubscriptionPlan || doc.subscriptionPlan;
        const renewalYears  = webhookRenewalYears || doc.multiYearCount || null;
        const currentExpiry = doc.expirationDate ? new Date(doc.expirationDate) : null;
        const renewalBase   = (currentExpiry && currentExpiry > now) ? currentExpiry : now;
        const renewalDocObj = {
          ...doc.toObject(),
          subscriptionPlan: renewalPlan,
          multiYearCount:   renewalYears,
          ...(webhookRenewalCount ? { committedCount: webhookRenewalCount, holderCountValue: webhookRenewalCount } : {}),
        };
        invoiceSnapshot = buildInvoiceSnapshot(renewalDocObj, registrationModel, amountDollars, renewalBase);
      } else {
        invoiceSnapshot = buildInvoiceSnapshot(doc, registrationModel, amountDollars, now);
      }

      const paymentData = {
        stripePaymentIntentId: pi.id,
        stripeChargeId,
        stripeCustomerId,
        paymentMethodType,
        last4,
        cardBrand,
        status:         'succeeded',
        isPaid:         true,
        paidAt:         now,
        amountCents,
        amountDollars:  invoiceSnapshot.totalPaid || amountDollars,
        currency:       pi.currency || 'usd',
        registrationId,
        registrationModel,
        invoiceNumber:  invoiceNum,
        invoiceSnapshot,
        invoiceDraft:   null,
        description:    pi.description || '',
        confirmedVia:   'webhook',
        purpose:              isPurposeRenewal ? 'renewal' : isPurposeHolderUpgradeWebhook ? 'holder-upgrade' : 'payment',
        newSubscriptionPlan:  newSubscriptionPlan || null,
        renewalMultiYearCount: webhookRenewalYears,
        renewalExactCount:     webhookRenewalCount,
      };

      let paymentDoc;
      if (existing) {
        Object.assign(existing, paymentData);
        paymentDoc = await existing.save();
      } else {
        paymentDoc = await Payment.create(paymentData);
      }

      let updatedRegWebhook;
      if (isPurposeRenewal) {
        updatedRegWebhook = await applyRenewalToRegistration(registrationId, registrationModel, paymentDoc);
      } else if (isPurposeHolderUpgradeWebhook) {
        const additionalCount = Number(pi.metadata?.additionalHolderCount || 0);
        if (additionalCount > 0) {
          const { doc: freshDoc, Model: freshModel } = await findRegistration(registrationId, registrationModel);
          if (freshDoc && freshModel) {
            const currentCommitted = Number(freshDoc.committedCount || freshDoc.holderCountValue || freshDoc.certificateHolders?.length || 0);
            const newCount = currentCommitted + additionalCount;
            const newPpc   = pi.metadata?.newPricePerCertificate
              ? Number(pi.metadata.newPricePerCertificate)
              : tierPpcForPlan(freshDoc.subscriptionPlan, newCount);
            updatedRegWebhook = await freshModel.findByIdAndUpdate(
              registrationId,
              { $set: {
                  committedCount:       newCount,
                  holderCountValue:     String(newCount),
                  pricePerCertificate:  newPpc,
                }
              },
              { new: true }
            );
          }
        } else {
          updatedRegWebhook = doc;
        }
      } else {
        updatedRegWebhook = await applyPaymentToRegistration(registrationId, registrationModel, paymentDoc);
      }

      // Create / update canonical Invoice document so admin and user see same invoice.
      try {
        await createOrUpdateInvoice({
          registrationId,
          registrationModel,
          paymentId:      paymentDoc._id,
          snapshot:       paymentDoc.invoiceSnapshot || {},
          amountDollars:  paymentDoc.amountDollars,
          paidAt:         paymentDoc.paidAt,
          paymentMethod:  paymentDoc.paymentMethodType || 'card',
          existingInvoiceNumber: paymentDoc.invoiceNumber,
        });
      } catch (invoiceErr) {
        console.warn('[stripeWebhook] Invoice doc creation failed:', invoiceErr.message);
      }

      // Send confirmation email — renewal vs first payment (non-blocking).
      // Only send if the frontend confirmation hasn't already sent it
      // (confirmedVia would be 'frontend' if frontend confirm already ran).
      if (updatedRegWebhook) {
        const sendFn = isPurposeRenewal
          ? (registrationModel === 'Individual' ? sendIndividualRenewalConfirmation : sendAirlineRenewalConfirmation)
          : (registrationModel === 'Individual' ? sendIndividualPaymentConfirmation : sendAirlinePaymentConfirmation);
        sendFn(updatedRegWebhook).catch((e) =>
          console.warn('[stripeWebhook] Email failed:', e.message)
        );
      }

      console.log(`[stripeWebhook] Payment ${paymentDoc._id} recorded for ${registrationModel} ${registrationId}`);
    } catch (err) {
      console.error('[stripeWebhook] Processing error:', err.message);
      // Return 500 so Stripe retries — do NOT return 200 on DB errors
      return res.status(500).send('Internal error processing payment. Will retry.');
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    const { registrationId, registrationModel } = pi.metadata || {};

    if (registrationId && registrationModel) {
      try {
        const { doc, Model } = await findRegistration(registrationId, registrationModel);
        if (doc && !doc.isPaid && Model) {
          await Model.findByIdAndUpdate(
            registrationId,
            { $set: { paymentStatus: 'failed', isFormCompleted: false, status: 'Inactive' } },
          );
        }
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          {
            $setOnInsert: {
              stripePaymentIntentId: pi.id,
              amountCents:           pi.amount,
              amountDollars:         pi.amount / 100,
              currency:              pi.currency || 'usd',
              registrationId,
              registrationModel,
              invoiceSnapshot: {
                name: '', email: '', phone: '', address: '',
                isAirline: registrationModel !== 'Individual',
                airlineName: '', subscriptionPlan: '',
                subscriptionDate: null, expirationDate: null,
                primaryCertificate: '', faaCertificateNumber: '', iacraTrackingNumber: '',
                holderCount: 0, pricePerCert: 0,
                subtotal: 0, tax: 0, totalPaid: 0,
              },
              invoiceNumber: `INV-FAILED-${Date.now()}`,
              invoiceDraft:  null,
            },
            $set: {
              status:      'failed',
              isPaid:      false,
              confirmedVia:'webhook',
              purpose:     'payment',
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (err) {
        console.error('[stripeWebhook] Failed payment update error:', err.message);
      }
    }
  }

  res.json({ received: true });
};


// ─── GET /api/payments/by-registration/:id ────────────────────────────────────
// Ownership enforced: non-admin users can only fetch payments for their own
// registration IDs. Admins can access any record.
exports.getPaymentsByRegistration = async (req, res) => {
  try {
    const targetId = req.params.id;

    // Authorization check — non-admins must own this registration
    if (req.user.role !== 'admin') {
      const userSubIds = (req.user.subscriptionIds || []).map(String);
      const userRegId  = req.user.registrationId ? String(req.user.registrationId) : null;
      const ownsRecord = userRegId === targetId || userSubIds.includes(targetId);
      if (!ownsRecord) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    }

    const payments = await Payment.find({ registrationId: targetId })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── GET /api/payments/:id ────────────────────────────────────────────────────
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment)
      return res.status(404).json({ success: false, message: 'Payment not found.' });

    // Ownership check — non-admins can only view payments tied to their own registrations
    if (req.user.role !== 'admin') {
      const userSubIds = (req.user.subscriptionIds || []).map(String);
      const userRegId  = req.user.registrationId ? String(req.user.registrationId) : null;
      const owns = userRegId === String(payment.registrationId)
        || userSubIds.includes(String(payment.registrationId));
      if (!owns)
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── Shared activation helper ─────────────────────────────────────────────────
/**
 * performQueuedRenewalActivation
 *
 * Core logic shared by:
 *   - activateQueuedRenewal (admin endpoint — can activate before expiry)
 *   - autoActivateRenewal   (user endpoint — only activates when activationDate ≤ now)
 *   - subscriptionReminderCron (daily cron pass)
 *
 * @param {Document} doc               - Mongoose registration document
 * @param {Model}    Model             - Mongoose model (Airlines | Individual)
 * @param {string}   registrationModel - 'Airlines' | 'Individual'
 * @param {boolean}  byAdmin           - true when triggered by an admin
 * @returns {Document} updated registration
 */
async function performQueuedRenewalActivation(doc, Model, registrationModel, byAdmin = false) {
  const nr  = doc.nextRenewal;
  const now = new Date();

  // Mark the standalone Renewal doc as active
  if (doc.nextRenewalId) {
    await Renewal.findByIdAndUpdate(doc.nextRenewalId, {
      $set: { status: 'active', activatedAt: now, activatedByAdmin: byAdmin },
    });
  }

  // Resolve expirationDate:
  // 1. Use the stored expiresAt from the nextRenewal snapshot (ideal path).
  // 2. Fallback: compute from plan + activationDate in case the snapshot was created
  //    before the expiresAt field was added (old data).
  // 3. null for Unlimited Plan (no expiry).
  const activePlan = nr.plan || doc.subscriptionPlan;
  const expiresAt  = nr.expiresAt
    || (activePlan !== 'Unlimited Plan'
        ? computeExpiry(activePlan, nr.activationDate || now, nr.multiYearCount)
        : null);

  const update = {
    subscriptionPlan:       activePlan,
    // subscriptionDate = the renewal's activationDate (when the new plan period starts),
    // not "now" which would show today's date instead of the queued start date.
    subscriptionDate:       nr.activationDate || now,
    invoiceNumber:          nr.invoiceNumber,
    invoiceStatus:          'Paid',
    paymentStatus:          'paid',
    isPaid:                 true,
    status:                 'Active',
    isFormCompleted:        true,
    // Reset reminder flags so the user gets fresh reminders for the new period
    expiryReminder60SentAt: null,
    expiryReminder30SentAt: null,
    ...(expiresAt ? { expirationDate: expiresAt } : {}),
    ...(nr.multiYearCount ? { multiYearCount: nr.multiYearCount } : {}),
    ...(registrationModel === 'Individual' && nr.price ? { price: nr.price } : {}),
    // Airline-only fields
    ...(registrationModel !== 'Individual' ? {
      ...(nr.committedCount ? {
        committedCount:   nr.committedCount,
        holderCountValue: String(nr.committedCount),
        holderCount:      holderRangeFromCount(nr.committedCount),
      } : {}),
      ...(nr.price ? { amountPaid: nr.price, totalAmount: nr.price } : {}),
    } : {}),
  };

  // nextRenewal is a typed subdocument — $unset leaves an empty shell.
  // Set each field to null explicitly, then $unset nextRenewalId.
  // The frontend checks nextRenewal.paidAt so nulling paidAt is sufficient,
  // but we also null the whole object for cleanliness.
  const updatedDoc = await Model.findByIdAndUpdate(
    doc._id,
    {
      $set:   { ...update, 'nextRenewal.paidAt': null, 'nextRenewal.plan': null,
                'nextRenewal.activationDate': null, 'nextRenewal.expiresAt': null,
                'nextRenewal.invoiceNumber': null, 'nextRenewal.price': null },
      $unset: { nextRenewalId: 1 },
    },
    { new: true },
  );

  // ── Send renewal activation email ─────────────────────────────────────────
  // The `lastRenewal` snapshot on the doc holds the renewal details for the email template.
  if (updatedDoc) {
    const sendFn = registrationModel === 'Individual'
      ? sendIndividualRenewalConfirmation
      : sendAirlineRenewalConfirmation;
    sendFn(updatedDoc).catch((e) =>
      console.warn('[performQueuedRenewalActivation] Renewal email failed:', e.message)
    );
  }

  return updatedDoc;
}
exports.performQueuedRenewalActivation = performQueuedRenewalActivation;


// ─── POST /api/payments/admin/activate-renewal (admin) ────────────────────────
// Admin-only: force-activate a queued renewal even before the expiry date.
exports.activateQueuedRenewal = async (req, res) => {
  try {
    const { registrationId, registrationModel } = req.body;
    if (!registrationId || !registrationModel)
      return res.status(400).json({ success: false, message: 'registrationId and registrationModel are required.' });

    const { doc, Model } = await findRegistration(registrationId, registrationModel);
    if (!doc || !Model)
      return res.status(404).json({ success: false, message: 'Registration not found.' });

    if (!doc.nextRenewal?.paidAt)
      return res.status(400).json({ success: false, message: 'No queued renewal found on this record.' });

    const updated = await performQueuedRenewalActivation(doc, Model, registrationModel, true);
    return res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── POST /api/payments/auto-activate-renewal (authenticated user) ─────────────
// Called by the user's own subscription page when the page detects that a queued
// renewal's activationDate has already passed.  Only activates if:
//   1. The caller owns this registration, AND
//   2. The activationDate is in the past (the plan legitimately expired).
exports.autoActivateRenewal = async (req, res) => {
  try {
    const { registrationId, registrationModel } = req.body;
    if (!registrationId || !registrationModel)
      return res.status(400).json({ success: false, message: 'registrationId and registrationModel are required.' });

    // Fetch the doc first so we can verify ownership by email as well as by ID.
    // (A newly-created airline user's JWT may not have registrationId populated yet
    //  if it was linked during this session — email is the reliable fallback.)
    const { doc, Model } = await findRegistration(registrationId, registrationModel);
    if (!doc || !Model)
      return res.status(404).json({ success: false, message: 'Registration not found.' });

    // Auth: admins can activate anything; regular users must own this registration.
    if (req.user.role !== 'admin') {
      const userSubIds = (req.user.subscriptionIds || []).map(String);
      const userRegId  = req.user.registrationId ? String(req.user.registrationId) : null;
      const userEmail  = req.user.email?.toLowerCase?.() || '';
      const docEmail   = (doc.email || doc.pointOfContactEmail || '').toLowerCase();
      const owns = userRegId === String(registrationId)
        || userSubIds.includes(String(registrationId))
        || (userEmail && docEmail && userEmail === docEmail);
      if (!owns)
        return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const nr = doc.nextRenewal;
    if (!nr?.paidAt)
      return res.status(400).json({ success: false, message: 'No queued renewal on this record.' });

    // Only auto-activate if the activation date has actually passed.
    // (Admin force-activate skips this check; user cannot activate early.)
    const activationDate = nr.activationDate ? new Date(nr.activationDate) : null;
    if (activationDate && activationDate > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Renewal activation date has not been reached yet.',
      });
    }

    const updated = await performQueuedRenewalActivation(doc, Model, registrationModel, false);
    return res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/payments (admin) ────────────────────────────────────────────────
exports.getAllPayments = async (req, res) => {
  try {
    const { status, model, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (model)  filter.registrationModel = model;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data:    payments,
      total,
      page:    Number(page),
      limit:   Number(limit),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

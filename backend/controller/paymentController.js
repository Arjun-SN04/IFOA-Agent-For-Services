/**
 * paymentController.js
 *
 * Handles all Stripe payment flows:
 *   POST /api/payments/create-intent          — create PaymentIntent, return clientSecret
 *   POST /api/payments/confirm                — called by frontend after Stripe succeeds;
 *                                               creates Payment record, marks subscription active
 *   POST /api/payments/webhook                — Stripe webhook (backup/authoritative confirm)
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
const { generateInvoiceNumber } = require('../services/invoiceNumberService');
const { createOrUpdateInvoice } = require('../services/invoiceService');

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
    // Unlimited Plan is still billed per-certificate × committedCount.
    // Always recompute from price × count to avoid legacy flat-rate bug.
    if (pricePerCert > 0 && holderCount > 0) {
      correctTotal = pricePerCert * holderCount;
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
    const { registrationId, registrationModel } = req.body;

    if (!registrationId || !registrationModel)
      return res.status(400).json({
        success: false,
        message: 'registrationId and registrationModel are required.',
      });

    const VALID_MODELS = ['Individual', 'Airlines', 'AirlinesSubscription'];
    if (!VALID_MODELS.includes(registrationModel))
      return res.status(400).json({ success: false, message: 'Invalid registrationModel.' });

    const { doc } = await findRegistration(registrationId, registrationModel);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Registration record not found.' });

    if (doc.isPaid || doc.paymentStatus === 'paid')
      return res.status(400).json({
        success: false,
        message: 'This subscription is already paid.',
      });

    // For airlines always compute from pricePerCert × committedCount for ALL plans
    let amountDollars;
    if (registrationModel !== 'Individual') {
      const ppc   = Number(doc.pricePerCertificate || doc.pricePerCert || 0);
      const count = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
      if (ppc > 0 && count > 0) {
        amountDollars = ppc * count;
      } else {
        amountDollars = Number(doc.totalAmount || doc.totalServiceFees || 0);
      }
    } else {
      amountDollars = Number(doc.price || doc.totalAmount || 0);
    }

    const amountCents = Math.round(amountDollars * 100);
    if (amountCents <= 0)
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: 'usd',
      payment_method_types: ['card'],
      description: `Subscription — ${registrationModel} ${registrationId}`,
      metadata: {
        registrationId:    String(registrationId),
        registrationModel,
      },
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

    const { doc } = await findRegistration(registrationId, registrationModel);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Registration record not found.' });

    const now           = new Date();
    // Generate a unique, DB-backed invoice number (format: Invoice US-350-26).
    // Reuse any number already on the registration (e.g. from a previous wire flow).
    const invoiceNum    = doc.invoiceNumber || await generateInvoiceNumber();
    const amountCents   = pi.amount_received || pi.amount;
    const amountDollars = amountCents / 100;

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

    const invoiceSnapshot = buildInvoiceSnapshot(doc, registrationModel, amountDollars, now);

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
      invoiceDraft:     null,
      description:      pi.description || '',
      ipAddress:        ipAddress || req.ip || '',
      userAgent:        userAgent || req.headers['user-agent'] || '',
      confirmedVia:     'frontend',
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

    const updatedReg = await applyPaymentToRegistration(registrationId, registrationModel, paymentDoc);

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
    const { registrationId, registrationModel } = pi.metadata || {};

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

      const now           = new Date();
      // Reuse existing invoice number or generate a fresh unique one.
      const invoiceNum    = doc.invoiceNumber || await generateInvoiceNumber();
      const amountCents   = pi.amount_received || pi.amount;
      const amountDollars = amountCents / 100;

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

      const invoiceSnapshot = buildInvoiceSnapshot(doc, registrationModel, amountDollars, now);

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
      };

      let paymentDoc;
      if (existing) {
        Object.assign(existing, paymentData);
        paymentDoc = await existing.save();
      } else {
        paymentDoc = await Payment.create(paymentData);
      }

      await applyPaymentToRegistration(registrationId, registrationModel, paymentDoc);

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
    res.json({ success: true, data: payment });
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

/**
 * paymentController.js
 *
 * Handles all Stripe payment flows:
 *   POST /api/payments/create-intent   — create PaymentIntent, return clientSecret
 *   POST /api/payments/confirm         — called by frontend after Stripe succeeds;
 *                                        creates Payment record, marks subscription active
 *   POST /api/payments/webhook         — Stripe webhook (backup/authoritative confirm)
 *   GET  /api/payments/by-registration/:id — fetch all Payment docs for a subscription
 *   GET  /api/payments/:id             — fetch single Payment doc
 */

const Stripe   = require('stripe');
const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY);

const Payment              = require('../models/Payment');
const Individual           = require('../models/Individual');
const Airlines             = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve a registration record from any of the three models */
async function findRegistration(registrationId, registrationModel) {
  if (registrationModel === 'Individual') {
    return { doc: await Individual.findById(registrationId), Model: Individual };
  }
  let doc = await Airlines.findById(registrationId);
  if (doc) return { doc, Model: Airlines };
  doc = await AirlinesSubscription.findById(registrationId);
  return { doc, Model: doc ? AirlinesSubscription : null };
}

/** Compute subscription expiry based on plan and start date */
function computeExpiry(subscriptionPlan, fromDate) {
  const d = new Date(fromDate);
  if (subscriptionPlan === '1 Year Subscription Plan') {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if (subscriptionPlan === 'Multiple Years Subscription Plan') {
    d.setFullYear(d.getFullYear() + 3);
    return d;
  }
  return null; // Unlimited Plan — no expiry
}

/** Build the complete invoice snapshot from a registration document */
function buildInvoiceSnapshot(rec, registrationModel, amountDollars, paidAt) {
  const isAirline = registrationModel !== 'Individual';
  const expirationDate = computeExpiry(rec.subscriptionPlan, paidAt);

  return {
    name: isAirline
      ? rec.airlineName || [rec.firstName, rec.lastName].filter(Boolean).join(' ') || [rec.contactFirstName, rec.contactLastName].filter(Boolean).join(' ')
      : [rec.firstName, rec.lastName].filter(Boolean).join(' '),
    email:   rec.email || rec.contactEmail || rec.paymentEmail || '',
    phone:   rec.phone || rec.contactPhone || '',
    address: [rec.addressLine1, rec.city, rec.state, rec.postalCode, rec.country].filter(Boolean).join(', '),
    isAirline,
    airlineName: rec.airlineName || '',

    subscriptionPlan: rec.subscriptionPlan || '',
    subscriptionDate: paidAt,
    expirationDate:   expirationDate,

    primaryCertificate:   rec.primaryCertificate || '',
    faaCertificateNumber: rec.faaCertificateNumber || '',
    iacraTrackingNumber:  rec.iacraTrackingNumber || '',

    holderCount:  rec.certificateHolders?.length || rec.committedCount || 0,
    pricePerCert: rec.pricePerCertificate || rec.pricePerCert || 0,

    subtotal:  amountDollars,
    tax:       0,
    totalPaid: amountDollars,
  };
}

/** Apply paid status to the registration document — called by both confirm & webhook */
async function applyPaymentToRegistration(registrationId, registrationModel, paymentDoc) {
  const { doc, Model } = await findRegistration(registrationId, registrationModel);
  if (!doc || !Model) return null;

  const now = paymentDoc.paidAt || new Date();
  const expirationDate = computeExpiry(doc.subscriptionPlan, now);

  const update = {
    paymentStatus:         'paid',
    isPaid:                true,
    status:                'Active',
    subscriptionDate:      now,
    invoiceStatus:         'Paid',
    invoiceNumber:         paymentDoc.invoiceNumber,
    stripePaymentIntentId: paymentDoc.stripePaymentIntentId,
    paymentId:             paymentDoc._id,
  };
  if (expirationDate) update.expirationDate = expirationDate;

  // For Airlines, also update amountPaid
  if (registrationModel !== 'Individual') {
    update.amountPaid = doc.totalAmount || doc.amountDollars || 0;
  }

  return Model.findByIdAndUpdate(registrationId, update, { new: true });
}


// ─── POST /api/payments/create-intent ────────────────────────────────────────
exports.createPaymentIntent = async (req, res) => {
  try {
    const { registrationId, registrationModel } = req.body;

    if (!registrationId || !registrationModel)
      return res.status(400).json({ success: false, message: 'registrationId and registrationModel are required.' });

    const { doc } = await findRegistration(registrationId, registrationModel);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Registration record not found.' });

    // Block if already paid (check both isPaid and paymentStatus)
    if (doc.isPaid || doc.paymentStatus === 'paid')
      return res.status(400).json({ success: false, message: 'This subscription is already paid.' });

    const amountDollars = doc.price || doc.totalAmount || doc.totalServiceFees || 0;
    const amountCents   = Math.round(amountDollars * 100);
    if (amountCents <= 0)
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount:   amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      description: `Subscription payment — ${registrationModel} ${registrationId}`,
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
// Called by the frontend immediately after stripe.confirmPayment() succeeds.
// This is the PRIMARY path for recording payments (webhook is the backup).
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
      return res.status(400).json({ success: false, message: 'paymentIntentId, registrationId, and registrationModel are required.' });

    // ── Idempotency: if Payment record already exists, return it ──────────────
    const existing = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (existing && existing.isPaid) {
      return res.json({ success: true, payment: existing, alreadyRecorded: true });
    }

    // ── Fetch and verify PaymentIntent from Stripe ────────────────────────────
    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (stripeErr) {
      return res.status(400).json({ success: false, message: `Stripe error: ${stripeErr.message}` });
    }

    if (pi.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Stripe status: ${pi.status}`,
      });
    }

    // ── Fetch registration record for invoice snapshot ────────────────────────
    const { doc } = await findRegistration(registrationId, registrationModel);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Registration record not found.' });

    const now          = new Date();
    const invoiceNum   = doc.invoiceNumber || `INV-${Date.now()}`;
    const amountCents  = pi.amount_received || pi.amount;
    const amountDollars = amountCents / 100;

    // ── Extract card/payment method details ────────────────────────────────────
    let last4 = '', cardBrand = '', paymentMethodType = '', stripeChargeId = '', stripeCustomerId = '';
    try {
      // Retrieve the charge for card details
      if (pi.latest_charge) {
        const charge = await stripe.charges.retrieve(pi.latest_charge);
        stripeChargeId    = charge.id || '';
        stripeCustomerId  = charge.customer || '';
        const pm = charge.payment_method_details;
        if (pm?.type === 'card') {
          last4             = pm.card?.last4 || '';
          cardBrand         = pm.card?.brand || '';
          paymentMethodType = 'card';
        } else {
          paymentMethodType = pm?.type || '';
        }
      }
    } catch (_) {
      // Non-critical — continue without card details
    }

    // ── Build the invoice snapshot ────────────────────────────────────────────
    const invoiceSnapshot = buildInvoiceSnapshot(doc, registrationModel, amountDollars, now);

    // ── Create (or update) the Payment document ───────────────────────────────
    const paymentData = {
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId,
      stripeCustomerId,
      paymentMethodType,
      last4,
      cardBrand,
      status:              'succeeded',
      isPaid:              true,
      paidAt:              now,
      amountCents,
      amountDollars,
      currency:            pi.currency || 'usd',
      registrationId,
      registrationModel,
      invoiceNumber:       invoiceNum,
      invoiceSnapshot,
      description:         pi.description || '',
      ipAddress:           ipAddress || req.ip || '',
      userAgent:           userAgent || req.headers['user-agent'] || '',
      confirmedVia:        'frontend',
    };

    let paymentDoc;
    if (existing) {
      // Already exists but wasn't paid — update it
      Object.assign(existing, paymentData);
      paymentDoc = await existing.save();
    } else {
      paymentDoc = await Payment.create(paymentData);
    }

    // ── Mark the registration as paid/active ─────────────────────────────────
    const updatedReg = await applyPaymentToRegistration(registrationId, registrationModel, paymentDoc);

    console.log(`[confirmPayment] Payment ${paymentDoc._id} confirmed for ${registrationModel} ${registrationId}`);

    res.json({
      success:     true,
      payment:     paymentDoc,
      registration: updatedReg,
    });
  } catch (err) {
    console.error('[confirmPayment]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Stripe webhook — authoritative backup confirm. Raw body required (set in server.js).
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

  // ── payment_intent.succeeded ──────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const { registrationId, registrationModel } = pi.metadata;

    if (!registrationId || !registrationModel) {
      console.warn('[stripeWebhook] Missing metadata on PaymentIntent:', pi.id);
      return res.json({ received: true });
    }

    try {
      // Idempotency check
      const existing = await Payment.findOne({ stripePaymentIntentId: pi.id });
      if (existing && existing.isPaid) {
        console.log(`[stripeWebhook] Already recorded: ${pi.id}`);
        return res.json({ received: true });
      }

      const { doc } = await findRegistration(registrationId, registrationModel);
      if (!doc) {
        console.error(`[stripeWebhook] Registration not found: ${registrationModel} ${registrationId}`);
        return res.json({ received: true }); // Acknowledge to prevent Stripe retries
      }

      const now           = new Date();
      const invoiceNum    = doc.invoiceNumber || `INV-${Date.now()}`;
      const amountCents   = pi.amount_received || pi.amount;
      const amountDollars = amountCents / 100;

      // Card details from charge
      let last4 = '', cardBrand = '', paymentMethodType = '', stripeChargeId = '', stripeCustomerId = '';
      try {
        if (pi.latest_charge) {
          const charge      = await stripe.charges.retrieve(pi.latest_charge);
          stripeChargeId    = charge.id || '';
          stripeCustomerId  = charge.customer || '';
          const pm = charge.payment_method_details;
          if (pm?.type === 'card') {
            last4             = pm.card?.last4 || '';
            cardBrand         = pm.card?.brand || '';
            paymentMethodType = 'card';
          } else {
            paymentMethodType = pm?.type || '';
          }
        }
      } catch (_) {}

      const invoiceSnapshot = buildInvoiceSnapshot(doc, registrationModel, amountDollars, now);

      const paymentData = {
        stripePaymentIntentId: pi.id,
        stripeChargeId,
        stripeCustomerId,
        paymentMethodType,
        last4,
        cardBrand,
        status:          'succeeded',
        isPaid:          true,
        paidAt:          now,
        amountCents,
        amountDollars,
        currency:        pi.currency || 'usd',
        registrationId,
        registrationModel,
        invoiceNumber:   invoiceNum,
        invoiceSnapshot,
        description:     pi.description || '',
        confirmedVia:    'webhook',
      };

      let paymentDoc;
      if (existing) {
        Object.assign(existing, paymentData);
        paymentDoc = await existing.save();
      } else {
        paymentDoc = await Payment.create(paymentData);
      }

      await applyPaymentToRegistration(registrationId, registrationModel, paymentDoc);
      console.log(`[stripeWebhook] Payment ${paymentDoc._id} recorded for ${registrationModel} ${registrationId}`);
    } catch (err) {
      console.error('[stripeWebhook] Processing error:', err.message);
      // Return 200 anyway — we log the error; Stripe would retry on non-200
    }
  }

  // ── payment_intent.payment_failed ────────────────────────────────────────
  if (event.type === 'payment_intent.payment_failed') {
    const pi = event.data.object;
    const { registrationId, registrationModel } = pi.metadata || {};
    if (registrationId && registrationModel) {
      try {
        // Mark as failed in registration doc (but don't touch isPaid)
        const { doc, Model } = await findRegistration(registrationId, registrationModel);
        if (doc && !doc.isPaid) {
          await Model.findByIdAndUpdate(registrationId, { paymentStatus: 'failed', status: 'Inactive' });
        }
        // Upsert a failed Payment record for audit trail
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: pi.id },
          {
            stripePaymentIntentId: pi.id,
            status:           'failed',
            isPaid:           false,
            amountCents:      pi.amount,
            amountDollars:    pi.amount / 100,
            currency:         pi.currency || 'usd',
            registrationId,
            registrationModel,
            invoiceNumber:    `INV-FAILED-${Date.now()}`,
            invoiceSnapshot:  {},
            confirmedVia:     'webhook',
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('[stripeWebhook] Failed payment update error:', err.message);
      }
    }
  }

  res.json({ received: true });
};


// ─── GET /api/payments/by-registration/:id ────────────────────────────────────
// Returns all Payment records for a given registration — used by admin & user dashboards
exports.getPaymentsByRegistration = async (req, res) => {
  try {
    const payments = await Payment.find({ registrationId: req.params.id })
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

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Payment.countDocuments(filter);
    res.json({ success: true, data: payments, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

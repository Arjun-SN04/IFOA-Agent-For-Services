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

const mongoose = require('mongoose');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Payment              = require('../models/Payment');
const Individual           = require('../models/Individual');
const Airlines             = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');
const Renewal              = require('../models/Renewal');
const {
  generateInvoiceNumber,
  isInvoiceNumberTaken,
  normalizeInvoiceNumber,
} = require('../services/invoiceNumberService');
const { createOrUpdateInvoice } = require('../services/invoiceService');
const { activeHolderGroupSlots, allHolderGroupSlots, currentBaseSlots, renewTierAnchor } = require('../utils/holderGroups');
const {
  sendIndividualPaymentConfirmation,
  sendAirlinePaymentConfirmation,
  sendIndividualRenewalConfirmation,
  sendAirlineRenewalConfirmation,
  sendAirlineHolderUpgradeConfirmation,
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
    // Fallback MUST match computeAirlinesExpirationDate() in airlinesController.js
    // (both use 2 = the documented multi-year minimum). Previously this used 3,
    // so the same airline got a different expiry depending on whether it was
    // activated via the Stripe path (here) or the wire/manual path. Callers
    // always pass an explicit count for individuals, so this only fixes the
    // airline cross-path discrepancy.
    const years = (multiYearCount && multiYearCount > 1) ? multiYearCount : 2;
    d.setFullYear(d.getFullYear() + years);
    return d;
  }
  return null; // Unlimited Plan — no expiry
}

// Derives year count from the stored price for Individual Multi-Year plans.
// price is always saved correctly ($55 × years); multiYearCount DB-defaults to 3.
// Returns null when price is insufficient, so callers can fall back to multiYearCount.
function effectiveMultiYears(plan, price) {
  if (plan !== 'Multiple Years Subscription Plan') return null;
  const dollars = Number(price);
  return dollars >= 110 ? Math.round(dollars / 55) : null;
}

/**
 * updateOriginalInvoiceAfterHolderUpgrade
 *
 * After a holder-upgrade payment succeeds the airline's committedCount and
 * pricePerCertificate have been bumped on the registration record.  The
 * ORIGINAL Payment / Invoice docs still show the old holder count and total.
 * This helper re-computes the invoice snapshot for the original payment and
 * updates both the Payment doc and the canonical Invoice doc so the user
 * always sees the active-plan totals on their invoice.
 *
 * @param {string}   registrationId
 * @param {string}   registrationModel
 * @param {Document} updatedReg  - The registration doc AFTER the count/ppc update
 */
async function updateOriginalInvoiceAfterHolderUpgrade(registrationId, registrationModel, updatedReg) {
  try {
    // Find the original (first-payment) Payment doc for this registration.
    const originalPayment = await Payment.findOne({
      registrationId,
      registrationModel,
      purpose: { $in: ['payment', null, undefined] },
      isPaid: true,
    }).sort({ paidAt: 1 }); // earliest paid payment = original subscription payment

    if (!originalPayment) return;

    const newCount = Number(updatedReg.committedCount || updatedReg.holderCountValue || 0);
    const newPpc   = Number(updatedReg.pricePerCertificate || updatedReg.pricePerCert || 0);
    // Multi-year base plans bill pricePerCert × count × years — include the year
    // multiplier so the refreshed original invoice total matches the active plan
    // (previously this dropped the years factor and undercounted multi-year totals).
    const snapPlan = updatedReg.subscriptionPlan || originalPayment.invoiceSnapshot?.subscriptionPlan;
    const refreshYears = snapPlan === 'Multiple Years Subscription Plan'
      ? Math.max(2, Number(updatedReg.multiYearCount || originalPayment.invoiceSnapshot?.multiYearCount || 2))
      : 1;
    const newTotal = newPpc > 0 && newCount > 0
      ? newPpc * newCount * refreshYears
      : originalPayment.amountDollars;

    // Update the snapshot in-place so the invoice PDF always reflects the current plan.
    const snap        = { ...(originalPayment.invoiceSnapshot || {}) };
    snap.holderCount  = newCount;
    snap.pricePerCert = newPpc;
    snap.subtotal     = newTotal;
    snap.totalPaid    = newTotal;

    originalPayment.invoiceSnapshot = snap;
    originalPayment.amountDollars   = newTotal;
    originalPayment.markModified('invoiceSnapshot');
    await originalPayment.save();

    // Build the plan label for the line item description
    const planLabel = (snap.subscriptionPlan || updatedReg.subscriptionPlan || '1 Year Plan')
      .replace(' Subscription Plan', '')
      .replace(' Plan', '');

    // Build updated line items reflecting the new holder count and total.
    // These are passed as draftOverrides so the draft (what the PDF reads) is
    // also updated — without this, the draft keeps the old quantity/total even
    // though the Invoice root fields are correctly updated.
    // Fold the year multiplier into unitPrice so quantity × unitPrice === totalPrice.
    const updatedLineItems = [{
      description: refreshYears > 1
        ? `Agent For Service - ${planLabel} (${refreshYears} Years)`
        : `Agent For Service - ${planLabel}`,
      quantity:    newCount,
      unitPrice:   newPpc * refreshYears,
      totalPrice:  newTotal,
    }];

    // Sync the canonical Invoice document so user and admin see the same total.
    // Pass draftOverrides so the PDF-ready draft is also refreshed.
    await createOrUpdateInvoice({
      registrationId,
      registrationModel,
      paymentId:             originalPayment._id,
      snapshot:              snap,
      amountDollars:         newTotal,
      paidAt:                originalPayment.paidAt,
      paymentMethod:         originalPayment.paymentMethodType || 'card',
      existingInvoiceNumber: originalPayment.invoiceNumber,
      draftOverrides: { lineItems: updatedLineItems },
    });
  } catch (err) {
    console.warn('[updateOriginalInvoiceAfterHolderUpgrade] Non-critical error:', err.message);
  }
}

/**
 * Build the invoice snapshot stored permanently on the Payment document.
 * For airlines the total is ALWAYS pricePerCert × committedCount so legacy
 * DB records with the old flat-rate bug are corrected at payment-confirm time.
 */
function buildInvoiceSnapshot(rec, registrationModel, amountDollars, paidAt) {
  const isAirline = registrationModel !== 'Individual';
  // Individual: derive from price (authoritative) with multiYearCount as fallback.
  // Airline: multiYearCount is always set explicitly (from metadata/renewalDocObj).
  const effectiveMultiYearCount = isAirline
    ? rec.multiYearCount
    : (effectiveMultiYears(rec.subscriptionPlan, rec.price) || rec.multiYearCount);
  const expirationDate = computeExpiry(rec.subscriptionPlan, paidAt, effectiveMultiYearCount);

  // Airline total: always recompute from price × count to avoid legacy bug
  const pricePerCert = Number(rec.pricePerCertificate || rec.pricePerCert || 0);
  const holderCount  = Number(
    rec.committedCount || rec.holderCountValue || rec.certificateHolders?.length || 0
  );

  let correctTotal = amountDollars;
  if (isAirline) {
    // Airline total: recompute from pricePerCert × committedCount (× years for multi-year).
    if (pricePerCert > 0 && holderCount > 0) {
      if (rec.subscriptionPlan === 'Multiple Years Subscription Plan' && effectiveMultiYearCount > 1) {
        correctTotal = pricePerCert * holderCount * effectiveMultiYearCount;
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
    multiYearCount:   effectiveMultiYearCount || null,
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
  // Holder IDs to remove when this queued renewal activates (airline downgrade scenario)
  const renewalHoldersToRemove = Array.isArray(paymentDoc.renewalHoldersToRemove) && paymentDoc.renewalHoldersToRemove.length
    ? paymentDoc.renewalHoldersToRemove
    : null;

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
    paymentId:       paymentDoc._id,
    invoiceNumber:   paymentDoc.invoiceNumber || '',
    plan:            activePlan,
    multiYearCount:  renewalMultiYearCount || null,
    committedCount:  renewalExactCount || null,  // airline: holder count at renewal time
    holdersToRemove: renewalHoldersToRemove,     // airline: holder _ids to remove on activation
    price:           paymentDoc.amountDollars || 0,
    paidAt:          paymentDoc.paidAt || now,
    activationDate:  base,
    expiresAt:       newExpiry || null,
    status:          isQueued ? 'queued' : 'active',
  });

  // ── Build the embedded snapshot for fast dashboard display ───────────────────
  const renewalSnapshot = {
    plan:             activePlan,
    multiYearCount:   renewalMultiYearCount || null,
    committedCount:   renewalExactCount || null,  // airline: user-selected count
    holdersToRemove:  renewalHoldersToRemove,     // airline: holder _ids to remove on activation
    paidAt:           paymentDoc.paidAt || now,
    activationDate:   base,
    expiresAt:        newExpiry || null,
    price:            paymentDoc.amountDollars || null,
    invoiceNumber:    paymentDoc.invoiceNumber || null,
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
    // Always update invoiceNumber so ACTIVE badge reflects the latest renewal invoice.
    if (paymentDoc.invoiceNumber) {
      update.invoiceNumber = paymentDoc.invoiceNumber;
    }
    update.stripePaymentIntentId   = paymentDoc.stripePaymentIntentId;
    update.paymentStatus           = 'paid';
    update.isPaid                  = true;
    update.status                  = 'Active';
    update.isFormCompleted         = true;
    // nextRenewal/nextRenewalId cleared via $unset below — do NOT put them in $set
    if (renewalMultiYearCount)     update.multiYearCount = renewalMultiYearCount;
    // Airline: update committed holder count + pricePerCertificate if user changed it at renewal time.
    // committedCount is the GRAND TOTAL (base + ALL holder-upgrade groups). The renewal count
    // (renewalExactCount) is the BASE plan only — groups stay separate until they renew — so we
    // add ALL their slots back to keep the invariant (the frontend derives base as
    // committedCount − allGroupSlots; subtracting only active would under-count the base).
    if (renewalExactCount && registrationModel !== 'Individual') {
      const grandTotal           = renewalExactCount + allHolderGroupSlots(doc.holderGroups);
      update.committedCount       = grandTotal;
      update.holderCountValue     = String(grandTotal);
      update.holderCount          = holderRangeFromCount(grandTotal);
      // Price/cert tier is based on the base renewal count the user actually paid for.
      const renewalPpc            = tierPpcForPlan(activePlan, Math.max(3, renewalExactCount));
      if (renewalPpc > 0) {
        update.pricePerCertificate = renewalPpc;
        update.pricePerCert        = renewalPpc;
      }
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
        // For immediate activations (expired plan): trim holders now.
        // Queued activations trim via performQueuedRenewalActivation.
        ...(renewalHoldersToRemove ? {
          $pull: {
            certificateHolders: {
              _id: {
                $in: renewalHoldersToRemove.map(id => {
                  try { return new mongoose.Types.ObjectId(id); } catch { return id; }
                }),
              },
            },
          },
        } : {}),
      };

  return Model.findByIdAndUpdate(registrationId, mongoOp, { new: true });
}

/**
 * applyGroupRenewal
 *
 * Renews ONE holder group (independent plan batch). Mirrors applyRenewalToRegistration
 * but scoped to a single holderGroups[] subdocument.
 *  - QUEUED  (group expiry still in future): stores group.nextRenewal; activates later.
 *  - IMMEDIATE (group already expired): extends the group's plan/expiry now and
 *    removes any deselected holders that belong to this group.
 */
async function applyGroupRenewal(registrationId, registrationModel, paymentDoc, groupId) {
  const { doc, Model } = await findRegistration(registrationId, registrationModel);
  if (!doc || !Model) return null;
  const group = doc.holderGroups?.id(groupId);
  if (!group) return doc;

  const now           = new Date();
  const plan          = paymentDoc.newSubscriptionPlan || group.plan;
  const count         = paymentDoc.renewalExactCount ? Number(paymentDoc.renewalExactCount) : Number(group.count || 1);
  // Add-on stacks on top of the active base — price its tier at the cumulative
  // position (anchor + count), so renewing above the base coverage moves to the
  // correct volume tier instead of always restarting at the 3-to-5 tier.
  const tierAnchor    = renewTierAnchor(doc, group, now);
  const ppc           = tierPpcForPlan(plan, Math.max(3, tierAnchor + count));
  const price         = paymentDoc.amountDollars || ppc * count;
  const currentExpiry = group.expirationDate ? new Date(group.expirationDate) : null;
  const base          = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const isQueued      = currentExpiry && currentExpiry > now;
  const newExpiry     = computeExpiry(plan, base, null);
  const holdersToRemove = Array.isArray(paymentDoc.renewalHoldersToRemove) && paymentDoc.renewalHoldersToRemove.length
    ? paymentDoc.renewalHoldersToRemove
    : null;

  // ── Merge into base plan ──────────────────────────────────────────────────
  // Same-plan upgrade group folds back into the base: its holders become base
  // holders (inherit the base plan + expiry) and its slots fold into committedCount.
  // committedCount delta = newCount − previousGroupCount (the group leaves the array,
  // the base absorbs `count` of its slots). Always immediate — never queued.
  if (paymentDoc.mergeTarget === 'base' && group.plan === doc.subscriptionPlan) {
    const prevGroupCount = Number(group.count || 0);
    if (holdersToRemove) {
      doc.certificateHolders = doc.certificateHolders.filter(
        h => !(String(h.holderGroupId || '') === String(groupId) && holdersToRemove.includes(String(h._id))),
      );
    }
    // Remaining group holders become base holders.
    (doc.certificateHolders || []).forEach(h => {
      if (String(h.holderGroupId || '') === String(groupId)) h.holderGroupId = null;
    });
    // Drop the group; fold its (possibly adjusted) slot count into the base total.
    doc.holderGroups = (doc.holderGroups || []).filter(g => String(g._id) !== String(groupId));
    const newCommitted = Math.max(0, Number(doc.committedCount || doc.holderCountValue || 0) - prevGroupCount + count);
    doc.committedCount = newCommitted;
    doc.holderCountValue = String(newCommitted);
    await doc.save();
    return doc;
  }

  if (isQueued) {
    group.nextRenewal = {
      plan, count, pricePerCert: ppc, price,
      paidAt:          paymentDoc.paidAt || now,
      activationDate:  base,
      expiresAt:       newExpiry || null,
      invoiceNumber:   paymentDoc.invoiceNumber || '',
      holdersToRemove: holdersToRemove,
    };
  } else {
    // Immediate activation — group already expired.
    group.plan           = plan;
    group.count          = count;
    group.pricePerCert   = ppc;
    group.amount         = price;
    group.subscriptionDate = base;
    group.expirationDate = newExpiry || null;
    group.invoiceNumber  = paymentDoc.invoiceNumber || group.invoiceNumber;
    group.paymentId      = paymentDoc._id;
    group.lastRenewal    = {
      plan, count, paidAt: paymentDoc.paidAt || now, activationDate: base,
      expiresAt: newExpiry || null, price, invoiceNumber: paymentDoc.invoiceNumber || '',
    };
    if (holdersToRemove) {
      doc.certificateHolders = doc.certificateHolders.filter(
        h => !(String(h.holderGroupId || '') === String(groupId) && holdersToRemove.includes(String(h._id))),
      );
    }
  }

  await doc.save();
  return doc;
}

async function applyPaymentToRegistration(registrationId, registrationModel, paymentDoc) {
  const { doc, Model } = await findRegistration(registrationId, registrationModel);
  if (!doc || !Model) return null;

  const now = paymentDoc.paidAt || new Date();
  // Payment doc carries the authoritative year count (stored from Stripe metadata).
  // Fall back to price-derived value, then raw multiYearCount.
  const effectiveMultiYearCount = paymentDoc.renewalMultiYearCount
    || effectiveMultiYears(doc.subscriptionPlan, doc.price)
    || doc.multiYearCount;
  const expirationDate = computeExpiry(doc.subscriptionPlan, now, effectiveMultiYearCount);

  const update = {
    paymentStatus:         'paid',
    isPaid:                true,
    isFormCompleted:       true,
    status:                'Active',
    subscriptionDate:      now,
    invoiceStatus:         'Paid',
    stripePaymentIntentId: paymentDoc.stripePaymentIntentId,
    paymentId:             paymentDoc._id,
  };
  // Preserve active invoice immutability: once set, never overwrite it.
  if (!doc.invoiceNumber && paymentDoc.invoiceNumber) {
    update.invoiceNumber = paymentDoc.invoiceNumber;
  }
  if (expirationDate) update.expirationDate = expirationDate;

  if (registrationModel !== 'Individual') {
    update.amountPaid = paymentDoc.invoiceSnapshot?.totalPaid || paymentDoc.amountDollars || 0;
    update.wirePaymentRequested = false;
    update.wirePaymentRequestedAt = null;
  }

  return Model.findByIdAndUpdate(registrationId, { $set: update }, { new: true });
}

/**
 * applyHolderUpgrade
 *
 * Applies a paid holder-upgrade to the registration. Idempotent (confirm + webhook
 * may both fire) via paymentDoc.appliedToRegistration.
 *
 *  mergeTarget === 'base'  → grow the base plan capacity (new holders inherit base dates)
 *  mergeTarget === groupId → grow that group's capacity (new holders inherit its dates)
 *  mergeTarget falsy       → create a NEW independent group with its own full-length term
 *
 * In every case committedCount grows by additionalCount and a SEPARATE invoice
 * (the Payment doc) already covers the charge. Merge never creates a new group.
 */
async function applyHolderUpgrade(registrationId, registrationModel, paymentDoc, meta) {
  const additionalCount = Number(meta.additionalCount || 0);
  if (additionalCount < 1) return null;

  // Idempotency — bail if a prior run (confirm or webhook) already applied this payment.
  const guard = await Payment.findById(paymentDoc._id).select('appliedToRegistration');
  if (guard?.appliedToRegistration) {
    const { doc } = await findRegistration(registrationId, registrationModel);
    return doc;
  }

  const { doc, Model } = await findRegistration(registrationId, registrationModel);
  if (!doc || !Model) return null;

  const now        = new Date();
  const batchPlan  = meta.batchPlan || doc.subscriptionPlan;
  const batchYears = meta.batchYears || (batchPlan === 'Multiple Years Subscription Plan' ? 3 : null);
  const newPpc     = Number(meta.newPpc || tierPpcForPlan(batchPlan, additionalCount));
  const mergeTarget = meta.mergeTarget || '';
  const currentCommitted = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
  const newCount = currentCommitted + additionalCount;

  let updatedReg;
  if (mergeTarget === 'base') {
    // Grow base capacity; merged holders fill base slots → inherit base plan/expiry.
    const set = { committedCount: newCount, holderCountValue: String(newCount) };
    if (batchPlan === doc.subscriptionPlan) set.pricePerCertificate = newPpc;
    updatedReg = await Model.findByIdAndUpdate(registrationId, { $set: set }, { new: true });
  } else if (mergeTarget) {
    // Grow the target group's capacity; merged holders inherit that group's dates.
    const grp = doc.holderGroups?.id ? doc.holderGroups.id(mergeTarget) : null;
    if (grp) {
      grp.count = Number(grp.count || 0) + additionalCount;
      doc.committedCount = newCount;
      doc.holderCountValue = String(newCount);
      await doc.save();
      updatedReg = doc;
    }
  }

  if (!updatedReg) {
    // Separate plan (default) — or merge target vanished: create a new independent group.
    // The new group carries its OWN pricePerCert; we must NOT touch the base plan's
    // pricePerCertificate here — the base keeps the rate the airline actually paid for
    // it. (Previously a same-plan add-on clobbered the base rate with the new tier.)
    const groupExists = (doc.holderGroups || []).some(g => String(g.paymentId || '') === String(paymentDoc._id));
    const set = { committedCount: newCount, holderCountValue: String(newCount) };
    const op = { $set: set };
    if (!groupExists) {
      op.$push = {
        holderGroups: {
          plan:             batchPlan,
          multiYearCount:   batchYears,
          count:            additionalCount,
          pricePerCert:     newPpc,
          amount:           paymentDoc.amountDollars,
          subscriptionDate: now,
          expirationDate:   computeExpiry(batchPlan, now, batchYears) || null,
          paymentId:        paymentDoc._id,
          invoiceNumber:    paymentDoc.invoiceNumber || '',
        },
      };
    }
    updatedReg = await Model.findByIdAndUpdate(registrationId, op, { new: true });
  }

  await Payment.findByIdAndUpdate(paymentDoc._id, { $set: { appliedToRegistration: true } });
  return updatedReg;
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
      renewalHoldersToRemove: bodyHoldersToRemove, // optional: holder _ids to remove on activation (airline downgrade)
      holderGroupId: bodyHolderGroupId,            // optional: renew a specific holder group instead of the base plan
      mergeTarget: bodyMergeTarget,                // optional (holder-upgrade): 'base' | '<groupId>' — merge slots into an existing plan
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

    // Guard: cannot renew an Unlimited Plan (it never expires).
    // For group renewals, check the GROUP's plan; otherwise the base plan.
    if (purpose === 'renewal' && !newSubscriptionPlan) {
      if (bodyHolderGroupId) {
        const g = (doc.holderGroups || []).find(grp => String(grp._id) === String(bodyHolderGroupId));
        if (g && g.plan === 'Unlimited Plan') {
          return res.status(400).json({ success: false, message: 'Unlimited Plan groups do not require renewal.' });
        }
      } else if (doc.subscriptionPlan === 'Unlimited Plan') {
        return res.status(400).json({
          success: false,
          message: 'Unlimited Plan subscriptions do not require renewal.',
        });
      }
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
    // computedYears: set inside each branch when plan is multi-year; used for
    // both amount calculation and Stripe metadata — avoids re-deriving twice.
    let computedYears = bodyRenewalYears ? Number(bodyRenewalYears) : null;

    // ── Holder upgrade: count-based charge for additional slots ─────────────────
    if (purpose === 'holder-upgrade') {
      const additional = Number(bodyAdditionalCount || 0);
      if (!additional || additional < 1)
        return res.status(400).json({ success: false, message: 'additionalHolderCount must be at least 1 for airline accounts.' });

      // Each holder-upgrade batch carries its OWN plan (independent group).
      // Fall back to the airline's current plan when none is supplied.
      const batchPlan = newSubscriptionPlan || doc.subscriptionPlan;

      // Determine new total count and look up tier-based ppc (pricing logic
      // unchanged: tier derived from the new total committed count).
      // Tier is based on current base slots (excludes previous-period upgrade plans)
      // so a stale leftover plan can't shift the tier.
      const newTotal = Math.max(3, currentBaseSlots(doc) + additional);
      const newPpc   = tierPpcForPlan(batchPlan, newTotal);

      // Multi-Year batches multiply by the selected year count.
      if (batchPlan === 'Multiple Years Subscription Plan') {
        computedYears = computedYears || 3;
        amountDollars = newPpc * additional * Math.max(2, computedYears);
      } else {
        // Count-based holder-upgrade amount: tier price x added holders.
        amountDollars = newPpc * additional;
      }
    } else if (purpose === 'renewal' && bodyHolderGroupId && registrationModel !== 'Individual') {
      // ── Group renewal: renew ONE holder group on its own plan/count ──────────
      const group = doc.holderGroups?.id
        ? doc.holderGroups.id(bodyHolderGroupId)
        : (doc.holderGroups || []).find(g => String(g._id) === String(bodyHolderGroupId));
      if (!group)
        return res.status(404).json({ success: false, message: 'Holder group not found.' });

      const groupPlan = newSubscriptionPlan || group.plan;
      // Count = user-selected (downgrade) or the group's current count.
      const renewCount = bodyRenewalCount ? Number(bodyRenewalCount) : Number(group.count || 1);
      // Add-on stacks on top of the active base — tier read at the cumulative
      // position so the charged ppc matches what the frontend displayed.
      const groupTierAnchor = renewTierAnchor(doc, group, new Date());
      const groupPpc = tierPpcForPlan(groupPlan, Math.max(3, groupTierAnchor + renewCount));
      amountDollars = groupPpc * renewCount;
    } else if (registrationModel !== 'Individual') {
      const activePlanForAirline = newSubscriptionPlan || doc.subscriptionPlan;
      // For renewals the user may have adjusted the holder count — use that if supplied.
      const renewalCount = bodyRenewalCount ? Number(bodyRenewalCount) : null;
      const count = renewalCount ||
        Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
      // Renewals: always recalculate tier-based ppc from the effective count so the
      // backend amount matches what the frontend getRenewPpc() displayed to the user.
      // Initial payments: use the stored pricePerCertificate set by admin at registration.
      const ppc = purpose === 'renewal'
        ? tierPpcForPlan(activePlanForAirline, Math.max(3, count))
        : Number(doc.pricePerCertificate || doc.pricePerCert || 0);
      if (ppc > 0 && count > 0) {
        if (activePlanForAirline === 'Multiple Years Subscription Plan') {
          computedYears = computedYears || doc.multiYearCount || 3;
          amountDollars = ppc * count * Math.max(2, computedYears);
        } else {
          amountDollars = ppc * count;  // 1 Year or Unlimited
        }
      } else {
        amountDollars = Number(doc.totalAmount || doc.totalServiceFees || 0);
      }
    } else {
      // Individual: use the renewal-selected plan and year count (or original doc values)
      const activePlan = newSubscriptionPlan || doc.subscriptionPlan;
      if (activePlan === 'Multiple Years Subscription Plan') {
        // user-supplied (already in computedYears) > price-derived > multiYearCount > default 3
        computedYears = computedYears || effectiveMultiYears(activePlan, doc.price) || doc.multiYearCount || 3;
      }
      const INDIVIDUAL_PLAN_PRICES = {
        '1 Year Subscription Plan':        69,
        'Multiple Years Subscription Plan': 55 * Math.max(2, computedYears || 3),
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
      return res.status(400).json({ success: false, message: `Payment amount too small (${amountDollars.toFixed(2)}). Minimum is $0.50.` });

    const metadata = {
      registrationId:    String(registrationId),
      registrationModel,
      purpose,
    };
    // Store new plan in metadata so webhook/confirm can apply plan change
    if (newSubscriptionPlan) metadata.newSubscriptionPlan = newSubscriptionPlan;
    // Group renewal target — confirm/webhook applies the renewal to this group.
    if (purpose === 'renewal' && bodyHolderGroupId) metadata.holderGroupId = String(bodyHolderGroupId);
    // Group renewal merge — fold the group back into the base plan (same plan type only).
    // applyGroupRenewal dissolves the group: its holders become base holders (inherit
    // base expiry) and its slots fold into the base committed count.
    if (purpose === 'renewal' && bodyHolderGroupId && bodyMergeTarget === 'base') {
      const grp = (doc.holderGroups || []).find(g => String(g._id) === String(bodyHolderGroupId));
      if (grp && grp.plan === doc.subscriptionPlan) metadata.mergeTarget = 'base';
    }
    // computedYears was set inside the amount block; propagate to metadata so
    // confirm/webhook can store it on the Payment doc without re-deriving.
    // Clamp to the SAME Math.max(2, …) the amount calculations applied so the
    // stored/charged term can never diverge (confirm/webhook build group expiry
    // from this value, while the amount was charged for the clamped term).
    if (computedYears) metadata.renewalMultiYearCount = String(Math.max(2, Number(computedYears)));
    // Store the RENEWAL-selected holder count for airline renewals
    if (bodyRenewalCount) metadata.renewalExactCount = String(Number(bodyRenewalCount));
    // Store holder IDs to remove on activation (airline downgrade: user reduced count)
    if (bodyHoldersToRemove && Array.isArray(bodyHoldersToRemove) && bodyHoldersToRemove.length) {
      metadata.renewalHoldersToRemove = JSON.stringify(bodyHoldersToRemove);
    }
    // Store additional holder count for holder-upgrade purpose
    if (bodyAdditionalCount) metadata.additionalHolderCount = String(Number(bodyAdditionalCount));
    // Store tier ppc + batch plan so confirm/webhook can build the holder group.
    if (purpose === 'holder-upgrade') {
      const _batchPlan  = newSubscriptionPlan || doc.subscriptionPlan;
      const _additional = Number(bodyAdditionalCount || 0);
      const _newTotal   = Math.max(3, currentBaseSlots(doc) + _additional);
      metadata.newPricePerCertificate = String(tierPpcForPlan(_batchPlan, _newTotal));
      // batchPlan mirrors newSubscriptionPlan; set explicitly so confirm/webhook
      // always have the group's plan even when it equals the base plan.
      metadata.batchPlan = _batchPlan;
      // Merge target — validate it's an existing plan of the SAME type, then persist.
      if (bodyMergeTarget) {
        if (bodyMergeTarget === 'base') {
          if (doc.subscriptionPlan === _batchPlan) metadata.mergeTarget = 'base';
        } else {
          const tg = (doc.holderGroups || []).find(g => String(g._id) === String(bodyMergeTarget));
          if (tg && tg.plan === _batchPlan) metadata.mergeTarget = String(bodyMergeTarget);
        }
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount:               amountCents,
      currency:             'usd',
      payment_method_types: ['card', 'us_bank_account'],
      description:          `Subscription — ${registrationModel} ${registrationId}`,
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

    // Renewals always get a fresh invoice number.
    // Non-renewal flows may reuse an existing invoice number only if it is not
    // already used elsewhere in DB.
    let invoiceNum;
    if (isPurposeRenewal) {
      invoiceNum = await generateInvoiceNumber();
    } else {
      const preferredInvoice = normalizeInvoiceNumber(doc.invoiceNumber);
      if (preferredInvoice) {
        const preferredTaken = await isInvoiceNumberTaken(preferredInvoice, {
          excludeRegistrationId: doc._id,
          excludeRegistrationModel: registrationModel,
        });
        invoiceNum = preferredTaken ? await generateInvoiceNumber() : preferredInvoice;
      } else {
        invoiceNum = await generateInvoiceNumber();
      }
    }

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
    let renewalHoldersToRemove = null;
    try {
      if (pi.metadata?.renewalHoldersToRemove) {
        renewalHoldersToRemove = JSON.parse(pi.metadata.renewalHoldersToRemove);
      }
    } catch (_) { /* non-critical */ }

    let invoiceSnapshot;
    if (isPurposeRenewal) {
      const renewalPlan      = pi.metadata?.newSubscriptionPlan || doc.subscriptionPlan;
      const renewalYears     = renewalMultiYearCount || doc.multiYearCount || null;
      const currentExpiry    = doc.expirationDate ? new Date(doc.expirationDate) : null;
      const renewalBase      = (currentExpiry && currentExpiry > now) ? currentExpiry : now;
      // Build snapshot as if subscription starts on renewalBase (not paidAt=now).
      // Override committedCount with the user-adjusted holder count for airlines.
      // price set to amountDollars so buildInvoiceSnapshot can derive Individual years from it.
      // For airline renewals: use renewal-tier PPC so buildInvoiceSnapshot totalPaid
      // matches what Stripe actually charged (not the original admin-set pricePerCertificate).
      const renewalPpcForSnapshot = registrationModel !== 'Individual' && renewalExactCount
        ? tierPpcForPlan(renewalPlan, Math.max(3, renewalExactCount))
        : null;
      const renewalDocObj = {
        ...doc.toObject(),
        subscriptionPlan: renewalPlan,
        multiYearCount:   renewalYears,
        price:            amountDollars,
        ...(renewalExactCount ? { committedCount: renewalExactCount, holderCountValue: renewalExactCount } : {}),
        ...(renewalPpcForSnapshot ? { pricePerCertificate: renewalPpcForSnapshot, pricePerCert: renewalPpcForSnapshot } : {}),
      };
      invoiceSnapshot = buildInvoiceSnapshot(renewalDocObj, registrationModel, amountDollars, renewalBase);
    } else if (isPurposeHolderUpgrade) {
      // Holder-upgrade snapshot must reflect the BATCH plan the airline paid for
      // (e.g. Unlimited), not the airline's base plan, and the added-holder count.
      const batchPlan = pi.metadata?.batchPlan || pi.metadata?.newSubscriptionPlan || doc.subscriptionPlan;
      const addCount  = Number(pi.metadata?.additionalHolderCount || 0) || 1;
      const batchPpc  = pi.metadata?.newPricePerCertificate
        ? Number(pi.metadata.newPricePerCertificate)
        : tierPpcForPlan(batchPlan, addCount);
      const upgradeDocObj = {
        ...doc.toObject(),
        subscriptionPlan:    batchPlan,
        multiYearCount:      renewalMultiYearCount || null,
        committedCount:      addCount,
        holderCountValue:    addCount,
        pricePerCertificate: batchPpc,
        pricePerCert:        batchPpc,
      };
      invoiceSnapshot = buildInvoiceSnapshot(upgradeDocObj, registrationModel, amountDollars, now);
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
      // Holder-upgrade: record the actual charge (newPpc × addedCount), not the full subscription total.
      // For regular payments: use the corrected total from the snapshot (pricePerCert × count).
      amountDollars:    isPurposeHolderUpgrade ? amountDollars : (invoiceSnapshot.totalPaid || amountDollars),
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
      renewalHoldersToRemove,
      mergeTarget: pi.metadata?.mergeTarget || '',
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
      updatedReg = pi.metadata?.holderGroupId
        ? await applyGroupRenewal(registrationId, registrationModel, paymentDoc, pi.metadata.holderGroupId)
        : await applyRenewalToRegistration(registrationId, registrationModel, paymentDoc);
    } else if (isPurposeHolderUpgrade) {
      // Apply the bought slots — merge into base/a group, or create a new group.
      const batchPlan = pi.metadata?.batchPlan || pi.metadata?.newSubscriptionPlan || doc.subscriptionPlan;
      updatedReg = await applyHolderUpgrade(registrationId, registrationModel, paymentDoc, {
        additionalCount: Number(pi.metadata?.additionalHolderCount || 0),
        batchPlan,
        batchYears: renewalMultiYearCount || (batchPlan === 'Multiple Years Subscription Plan' ? 3 : null),
        newPpc: pi.metadata?.newPricePerCertificate ? Number(pi.metadata.newPricePerCertificate) : null,
        mergeTarget: pi.metadata?.mergeTarget || '',
      }) || doc;

    } else {
      updatedReg = await applyPaymentToRegistration(registrationId, registrationModel, paymentDoc);
    }

    // Create the canonical Invoice document for this payment.
    // Holder-upgrades get their OWN new Invoice doc (not replacing the original).
    // The original subscription invoice is left untouched so both are preserved.
    try {
      let upgradeSnapshot = paymentDoc.invoiceSnapshot || {};
      if (isPurposeHolderUpgrade) {
        // Build a snapshot scoped to just the additional charge so the invoice
        // shows additionalCount × newPpc = amountDollars (not the full plan total).
        const additionalCount = Number(pi.metadata?.additionalHolderCount || 0);
        const newPpc = Number(pi.metadata?.newPricePerCertificate || 0);
        upgradeSnapshot = {
          ...upgradeSnapshot,
          holderCount:  additionalCount || upgradeSnapshot.holderCount,
          pricePerCert: newPpc || upgradeSnapshot.pricePerCert,
        };
      }
      const invoiceDoc = await createOrUpdateInvoice({
        registrationId,
        registrationModel,
        paymentId:      paymentDoc._id,
        snapshot:       upgradeSnapshot,
        amountDollars:  paymentDoc.amountDollars,
        paidAt:         paymentDoc.paidAt,
        paymentMethod:  paymentDoc.paymentMethodType || 'card',
        existingInvoiceNumber: paymentDoc.invoiceNumber,
        purpose:        isPurposeRenewal ? 'renewal' : isPurposeHolderUpgrade ? 'holder-upgrade' : 'payment',
      });

      // For renewals: if createOrUpdateInvoice generated a different invoice number
      // (because the preferred one was already taken), sync the canonical number back
      // to the Payment doc, Registration nextRenewal, and Renewal collection doc.
      if (isPurposeRenewal && invoiceDoc && invoiceDoc.invoiceNumber && invoiceDoc.invoiceNumber !== paymentDoc.invoiceNumber) {
        const canonicalNum = invoiceDoc.invoiceNumber;
        await Promise.all([
          Payment.findByIdAndUpdate(paymentDoc._id, { $set: { invoiceNumber: canonicalNum } }),
          Renewal.findOneAndUpdate({ paymentId: paymentDoc._id }, { $set: { invoiceNumber: canonicalNum } }),
          (async () => {
            const { doc: freshReg, Model: freshModel } = await findRegistration(registrationId, registrationModel);
            if (freshReg && freshModel) {
              if (freshReg.nextRenewal?.paidAt) {
                await freshModel.findByIdAndUpdate(registrationId, { $set: { 'nextRenewal.invoiceNumber': canonicalNum } });
              } else if (!freshReg.nextRenewal?.paidAt) {
                await freshModel.findByIdAndUpdate(registrationId, { $set: { 'lastRenewal.invoiceNumber': canonicalNum } });
              }
            }
          })(),
        ]);
      }
    } catch (invoiceErr) {
      console.warn('[confirmPayment] Invoice doc creation failed:', invoiceErr.message);
    }

    console.log(`[confirmPayment] Payment ${paymentDoc._id} confirmed for ${registrationModel} ${registrationId}`);

    res.json({
      success:      true,
      payment:      paymentDoc,
      registration: updatedReg,
    });

    // Send confirmation email (non-blocking).
    if (updatedReg) {
      if (isPurposeHolderUpgrade) {
        sendAirlineHolderUpgradeConfirmation(
          updatedReg,
          Number(pi.metadata?.additionalHolderCount || 0),
          Number(pi.metadata?.newPricePerCertificate || 0),
          amountDollars,
          req.user?.email,
        ).catch((e) => console.warn('[confirmPayment] Email failed:', e.message));
      } else {
        const sendFn = isPurposeRenewal
          ? (registrationModel === 'Individual' ? sendIndividualRenewalConfirmation : sendAirlineRenewalConfirmation)
          : (registrationModel === 'Individual' ? sendIndividualPaymentConfirmation : sendAirlinePaymentConfirmation);
        sendFn(updatedReg, req.user?.email).catch((e) =>
          console.warn('[confirmPayment] Email failed:', e.message)
        );
      }
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

    const paymentDoc = await Payment.findById(req.params.id);

    if (!paymentDoc)
      return res.status(404).json({ success: false, message: 'Payment record not found.' });

    const requestedInvoiceNumber = normalizeInvoiceNumber(invoiceNumber);

    const changingInvoiceNumber =
      requestedInvoiceNumber &&
      paymentDoc.invoiceNumber &&
      requestedInvoiceNumber !== paymentDoc.invoiceNumber;

    // Admin may change invoice number, but it must remain globally unique.
    if (changingInvoiceNumber) {
      const alreadyUsed = await isInvoiceNumberTaken(requestedInvoiceNumber, {
        excludePaymentId: paymentDoc._id,
      });
      if (alreadyUsed) {
        return res.status(400).json({
          success: false,
          message: 'Invoice number already exists. Please use a different value.',
        });
      }
      paymentDoc.invoiceNumber = requestedInvoiceNumber;
    }

    // If this legacy payment has no invoice number yet, assign one only after DB uniqueness check.
    if (requestedInvoiceNumber && !paymentDoc.invoiceNumber) {
      const alreadyUsed = await isInvoiceNumberTaken(requestedInvoiceNumber, {
        excludePaymentId: paymentDoc._id,
      });
      if (alreadyUsed) {
        return res.status(400).json({
          success: false,
          message: 'Invoice number already exists. Please use a different value.',
        });
      }
      paymentDoc.invoiceNumber = requestedInvoiceNumber;
    }

    if (invoiceDraft !== undefined) paymentDoc.invoiceDraft = invoiceDraft;
    await paymentDoc.save();

    // Sync invoiceNumber + invoiceDraft back to the registration record.
    if (paymentDoc.registrationId && paymentDoc.registrationModel) {
      try {
        const { doc, Model } = await findRegistration(
          paymentDoc.registrationId,
          paymentDoc.registrationModel,
        );
        if (doc && Model) {
          // Queued renewal: payment belongs to the next plan; update only nextRenewal.invoiceNumber.
          const isQueuedRenewal = paymentDoc.purpose === 'renewal' && doc.nextRenewal?.paidAt;
          const registrationSet = {
            invoiceGenerated: true,
          };

          if (isQueuedRenewal) {
            if (paymentDoc.invoiceNumber) {
              registrationSet['nextRenewal.invoiceNumber'] = paymentDoc.invoiceNumber;
              // Keep Renewal collection doc in sync with the canonical invoice number.
              Renewal.findOneAndUpdate(
                { paymentId: paymentDoc._id },
                { $set: { invoiceNumber: paymentDoc.invoiceNumber } },
              ).catch(() => {});
            }
          } else {
            // Admin-initiated invoice edits should sync to the active registration.
            if (paymentDoc.invoiceNumber) {
              registrationSet.invoiceNumber = paymentDoc.invoiceNumber;
            }
            registrationSet.invoiceDraft = invoiceDraft || doc.invoiceDraft || null;
          }

          await Model.findByIdAndUpdate(paymentDoc.registrationId, {
            $set: registrationSet,
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
        if (paymentDoc.invoiceNumber) existingInvoice.invoiceNumber = paymentDoc.invoiceNumber;
        if (invoiceDraft) existingInvoice.draft = invoiceDraft;
        existingInvoice.adminGenerated = true;
        await existingInvoice.save();
      } else if (paymentDoc.registrationId && paymentDoc.registrationModel) {
        // No Invoice doc yet (e.g. wire payment); create one now.
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
          existingInvoiceNumber: paymentDoc.invoiceNumber,
        });
      }
    } catch (invErr) {
      console.warn('[saveInvoiceDraft] Invoice doc sync failed:', invErr.message);
    }

    res.json({ success: true, data: paymentDoc });
  } catch (err) {
    console.error('[saveInvoiceDraft]', err.message);
    if (err?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists. Please use a different value.',
      });
    }
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
      // Reuse existing numbers only when they are already tied to this same record.
      let invoiceNum;
      if (isPurposeRenewal) {
        invoiceNum = existing?.invoiceNumber || await generateInvoiceNumber();
      } else {
        const preferredInvoice = normalizeInvoiceNumber(existing?.invoiceNumber || doc.invoiceNumber);
        if (preferredInvoice) {
          const preferredTaken = await isInvoiceNumberTaken(preferredInvoice, {
            excludePaymentId: existing?._id || null,
            excludeRegistrationId: doc._id,
            excludeRegistrationModel: registrationModel,
          });
          invoiceNum = preferredTaken ? await generateInvoiceNumber() : preferredInvoice;
        } else {
          invoiceNum = await generateInvoiceNumber();
        }
      }

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
      let webhookHoldersToRemove = null;
      try {
        if (pi.metadata?.renewalHoldersToRemove) {
          webhookHoldersToRemove = JSON.parse(pi.metadata.renewalHoldersToRemove);
        }
      } catch (_) { /* non-critical */ }

      let invoiceSnapshot;
      if (isPurposeRenewal) {
        const renewalPlan   = pi.metadata?.newSubscriptionPlan || doc.subscriptionPlan;
        const renewalYears  = webhookRenewalYears || doc.multiYearCount || null;
        const currentExpiry = doc.expirationDate ? new Date(doc.expirationDate) : null;
        const renewalBase   = (currentExpiry && currentExpiry > now) ? currentExpiry : now;
        // price set to amountDollars so buildInvoiceSnapshot can derive Individual years from it.
        const webhookRenewalPpc = registrationModel !== 'Individual' && webhookRenewalCount
          ? tierPpcForPlan(renewalPlan, Math.max(3, webhookRenewalCount))
          : null;
        const renewalDocObj = {
          ...doc.toObject(),
          subscriptionPlan: renewalPlan,
          multiYearCount:   renewalYears,
          price:            amountDollars,
          ...(webhookRenewalCount ? { committedCount: webhookRenewalCount, holderCountValue: webhookRenewalCount } : {}),
          ...(webhookRenewalPpc ? { pricePerCertificate: webhookRenewalPpc, pricePerCert: webhookRenewalPpc } : {}),
        };
        invoiceSnapshot = buildInvoiceSnapshot(renewalDocObj, registrationModel, amountDollars, renewalBase);
      } else if (isPurposeHolderUpgradeWebhook) {
        // Build the snapshot from the BATCH (added holders only) — no registration
        // mutation here; the actual application happens via applyHolderUpgrade below.
        const additionalCount = pi.metadata?.additionalHolderCount ? Number(pi.metadata.additionalHolderCount) : 0;
        const batchPlan = pi.metadata?.batchPlan || pi.metadata?.newSubscriptionPlan || doc.subscriptionPlan;
        const batchPpc = pi.metadata?.newPricePerCertificate
          ? Number(pi.metadata.newPricePerCertificate)
          : tierPpcForPlan(batchPlan, Math.max(3, additionalCount || 1));
        const upgradeDocObj = {
          ...doc.toObject(),
          subscriptionPlan:    batchPlan,
          committedCount:      additionalCount || 1,
          holderCountValue:    additionalCount || 1,
          pricePerCertificate: batchPpc,
          pricePerCert:        batchPpc,
        };
        invoiceSnapshot = buildInvoiceSnapshot(upgradeDocObj, registrationModel, amountDollars, now);
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
        amountDollars:  isPurposeHolderUpgradeWebhook ? amountDollars : (invoiceSnapshot.totalPaid || amountDollars),
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
        renewalHoldersToRemove: webhookHoldersToRemove,
        mergeTarget: pi.metadata?.mergeTarget || '',
      };

      let paymentDoc;
      const alreadyConfirmedByFrontend = existing?.confirmedVia === 'frontend';
      if (existing) {
        Object.assign(existing, paymentData);
        paymentDoc = await existing.save();
      } else {
        paymentDoc = await Payment.create(paymentData);
      }

      let updatedRegWebhook;
      if (isPurposeRenewal) {
        updatedRegWebhook = pi.metadata?.holderGroupId
          ? await applyGroupRenewal(registrationId, registrationModel, paymentDoc, pi.metadata.holderGroupId)
          : await applyRenewalToRegistration(registrationId, registrationModel, paymentDoc);
      } else if (isPurposeHolderUpgradeWebhook) {
        const batchPlan = pi.metadata?.batchPlan || pi.metadata?.newSubscriptionPlan || doc.subscriptionPlan;
        updatedRegWebhook = await applyHolderUpgrade(registrationId, registrationModel, paymentDoc, {
          additionalCount: Number(pi.metadata?.additionalHolderCount || 0),
          batchPlan,
          batchYears: webhookRenewalYears || (batchPlan === 'Multiple Years Subscription Plan' ? 3 : null),
          newPpc: pi.metadata?.newPricePerCertificate ? Number(pi.metadata.newPricePerCertificate) : null,
          mergeTarget: pi.metadata?.mergeTarget || '',
        }) || doc;

      } else {
        updatedRegWebhook = await applyPaymentToRegistration(registrationId, registrationModel, paymentDoc);
      }

      // Create canonical Invoice doc for this payment.
      // Holder-upgrades get their own new Invoice doc — original subscription invoice untouched.
      try {
        let upgradeSnapshotWebhook = paymentDoc.invoiceSnapshot || {};
        if (isPurposeHolderUpgradeWebhook) {
          const additionalCountW = Number(pi.metadata?.additionalHolderCount || 0);
          const newPpcW = Number(pi.metadata?.newPricePerCertificate || 0);
          upgradeSnapshotWebhook = {
            ...upgradeSnapshotWebhook,
            holderCount:  additionalCountW || upgradeSnapshotWebhook.holderCount,
            pricePerCert: newPpcW || upgradeSnapshotWebhook.pricePerCert,
          };
        }
        const webhookInvoiceDoc = await createOrUpdateInvoice({
          registrationId,
          registrationModel,
          paymentId:      paymentDoc._id,
          snapshot:       upgradeSnapshotWebhook,
          amountDollars:  paymentDoc.amountDollars,
          paidAt:         paymentDoc.paidAt,
          paymentMethod:  paymentDoc.paymentMethodType || 'card',
          existingInvoiceNumber: paymentDoc.invoiceNumber,
          purpose:        isPurposeRenewal ? 'renewal' : isPurposeHolderUpgradeWebhook ? 'holder-upgrade' : 'payment',
        });

        // For renewals: sync canonical invoice number back if it differs from payment doc.
        if (isPurposeRenewal && webhookInvoiceDoc && webhookInvoiceDoc.invoiceNumber && webhookInvoiceDoc.invoiceNumber !== paymentDoc.invoiceNumber) {
          const canonicalNumW = webhookInvoiceDoc.invoiceNumber;
          await Promise.all([
            Payment.findByIdAndUpdate(paymentDoc._id, { $set: { invoiceNumber: canonicalNumW } }),
            Renewal.findOneAndUpdate({ paymentId: paymentDoc._id }, { $set: { invoiceNumber: canonicalNumW } }),
            (async () => {
              const { doc: freshRegW, Model: freshModelW } = await findRegistration(registrationId, registrationModel);
              if (freshRegW && freshModelW) {
                if (freshRegW.nextRenewal?.paidAt) {
                  await freshModelW.findByIdAndUpdate(registrationId, { $set: { 'nextRenewal.invoiceNumber': canonicalNumW } });
                } else {
                  await freshModelW.findByIdAndUpdate(registrationId, { $set: { 'lastRenewal.invoiceNumber': canonicalNumW } });
                }
              }
            })(),
          ]);
        }
      } catch (invoiceErr) {
        console.warn('[stripeWebhook] Invoice doc creation failed:', invoiceErr.message);
      }

      // Send confirmation email — skip if frontend confirmPayment already sent it.
      if (updatedRegWebhook && !alreadyConfirmedByFrontend) {
        if (isPurposeHolderUpgradeWebhook) {
          sendAirlineHolderUpgradeConfirmation(
            updatedRegWebhook,
            Number(pi.metadata?.additionalHolderCount || 0),
            Number(pi.metadata?.newPricePerCertificate || 0),
            amountDollars,
          ).catch((e) => console.warn('[stripeWebhook] Email failed:', e.message));
        } else {
          const sendFn = isPurposeRenewal
            ? (registrationModel === 'Individual' ? sendIndividualRenewalConfirmation : sendAirlineRenewalConfirmation)
            : (registrationModel === 'Individual' ? sendIndividualPaymentConfirmation : sendAirlinePaymentConfirmation);
          sendFn(updatedRegWebhook).catch((e) =>
            console.warn('[stripeWebhook] Email failed:', e.message)
          );
        }
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
              invoiceNumber: await generateInvoiceNumber(),
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

    // Suppress invoices the admin has deleted (recorded on the registration's
    // hiddenInvoiceNumbers) so they disappear for the customer too.
    const regDoc =
      (await Airlines.findById(targetId).select('hiddenInvoiceNumbers').lean()) ||
      (await Individual.findById(targetId).select('hiddenInvoiceNumbers').lean());
    const hiddenSet = new Set(
      (regDoc?.hiddenInvoiceNumbers || []).map(n => normalizeInvoiceNumber(n))
    );
    const visiblePayments = hiddenSet.size
      ? payments.filter(p => !hiddenSet.has(normalizeInvoiceNumber(p.invoiceNumber)))
      : payments;

    res.json({ success: true, data: visiblePayments });
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

  // Airline: compute correct PPC and explicit totalAmount for the activated plan.
  // findByIdAndUpdate bypasses the pre-save hook, so we must set totalAmount manually.
  // committedCount is the GRAND TOTAL (base + ALL holder-upgrade groups). nr.committedCount is
  // the BASE renewal count only; groups stay separate, so add ALL their slots back to keep the
  // invariant the frontend relies on (base = committedCount − allGroupSlots).
  const renewalBaseCount = nr.committedCount ? Number(nr.committedCount) : (doc.committedCount || null);
  const newCommittedCount = renewalBaseCount != null ? renewalBaseCount + allHolderGroupSlots(doc.holderGroups) : null;
  let newPricePerCert = doc.pricePerCertificate;
  let computedTotalAmount = nr.price || null;
  if (registrationModel !== 'Individual' && renewalBaseCount) {
    // Tier + total are based on the base renewal count actually paid for.
    newPricePerCert = tierPpcForPlan(activePlan, renewalBaseCount);
    if (!computedTotalAmount) {
      computedTotalAmount = activePlan === 'Multiple Years Subscription Plan' && nr.multiYearCount > 1
        ? newPricePerCert * renewalBaseCount * nr.multiYearCount
        : newPricePerCert * renewalBaseCount;
    }
  }

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
      ...(newCommittedCount ? {
        committedCount:      newCommittedCount,
        holderCountValue:    String(newCommittedCount),
        holderCount:         holderRangeFromCount(newCommittedCount),
        pricePerCertificate: newPricePerCert,
      } : {}),
      ...(computedTotalAmount ? { amountPaid: computedTotalAmount, totalAmount: computedTotalAmount } : {}),
    } : {}),
  };

  // Holder IDs to remove from certificateHolders array when this renewal activates.
  const holdersToRemove = Array.isArray(nr.holdersToRemove) && nr.holdersToRemove.length
    ? nr.holdersToRemove
    : null;

  // nextRenewal is a typed subdocument — $unset leaves an empty shell.
  // Set each field to null explicitly, then $unset nextRenewalId.
  // The frontend checks nextRenewal.paidAt so nulling paidAt is sufficient,
  // but we also null the whole object for cleanliness.
  const mongoUpdateOp = {
    $set:   { ...update, 'nextRenewal.paidAt': null, 'nextRenewal.plan': null,
              'nextRenewal.activationDate': null, 'nextRenewal.expiresAt': null,
              'nextRenewal.invoiceNumber': null, 'nextRenewal.price': null,
              'nextRenewal.holdersToRemove': null },
    $unset: { nextRenewalId: 1 },
    // Remove specific certificate holder subdocs whose _id was marked for removal.
    // $pull and $set can coexist when they target different field paths.
    // Convert string IDs to ObjectId for proper subdocument _id matching.
    ...(holdersToRemove ? {
      $pull: {
        certificateHolders: {
          _id: {
            $in: holdersToRemove.map(id => {
              try { return new mongoose.Types.ObjectId(id); } catch { return id; }
            }),
          },
        },
      },
    } : {}),
  };

  const updatedDoc = await Model.findByIdAndUpdate(doc._id, mongoUpdateOp, { new: true });

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

/**
 * performQueuedGroupRenewals
 *
 * Activates any holder-group queued renewals whose activationDate has passed.
 * Each group is independent; a group activates when its own nextRenewal is due.
 * Returns the (possibly) updated registration document.
 */
async function performQueuedGroupRenewals(doc, Model) {
  if (!doc?.holderGroups?.length) return doc;
  const now = new Date();
  let changed = false;
  doc.holderGroups.forEach((group) => {
    const nr = group.nextRenewal;
    if (!nr || !nr.paidAt || !nr.activationDate || new Date(nr.activationDate) > now) return;
    group.plan = nr.plan || group.plan;
    if (nr.count)        group.count        = nr.count;
    if (nr.pricePerCert) group.pricePerCert = nr.pricePerCert;
    if (nr.price)        group.amount       = nr.price;
    group.subscriptionDate = nr.activationDate;
    group.expirationDate   = nr.expiresAt || null;
    if (nr.invoiceNumber)  group.invoiceNumber = nr.invoiceNumber;
    group.lastRenewal = {
      plan: nr.plan, count: nr.count, paidAt: nr.paidAt, activationDate: nr.activationDate,
      expiresAt: nr.expiresAt, price: nr.price, invoiceNumber: nr.invoiceNumber,
    };
    if (Array.isArray(nr.holdersToRemove) && nr.holdersToRemove.length) {
      const gid = String(group._id);
      doc.certificateHolders = doc.certificateHolders.filter(
        h => !(String(h.holderGroupId || '') === gid && nr.holdersToRemove.includes(String(h._id))),
      );
    }
    group.nextRenewal = {
      plan: null, count: null, pricePerCert: null, price: null, paidAt: null,
      activationDate: null, expiresAt: null, invoiceNumber: null, holdersToRemove: null,
    };
    changed = true;
  });
  if (changed) await doc.save();
  return doc;
}
exports.performQueuedGroupRenewals = performQueuedGroupRenewals;


// ─── Admin manual holder-upgrade (no Stripe) ──────────────────────────────────
/**
 * Creates a Payment + canonical Invoice for an admin-added holder group.
 * Used when the admin marks an increment as Paid. Mirrors the holder-upgrade
 * invoice shape so the airline sees the same invoice it would for a Stripe upgrade.
 */
async function createGroupInvoiceAndPayment(doc, group) {
  const now = group.subscriptionDate || new Date();
  const invoiceNum = await generateInvoiceNumber();
  const snapshot = buildInvoiceSnapshot(
    {
      ...doc.toObject(),
      subscriptionPlan:    group.plan,
      committedCount:      group.count,
      holderCountValue:    group.count,
      pricePerCertificate: group.pricePerCert,
      pricePerCert:        group.pricePerCert,
    },
    'Airlines', group.amount, now,
  );
  const payment = await Payment.create({
    // Clean, human-readable reference for manual/admin payments (no real Stripe txn).
    stripePaymentIntentId: `MANUAL-${invoiceNum}`,
    status: 'succeeded', isPaid: true, paidAt: now,
    amountCents: Math.round(Number(group.amount) * 100), amountDollars: Number(group.amount), currency: 'usd',
    registrationId: doc._id, registrationModel: 'Airlines',
    invoiceNumber: invoiceNum, invoiceSnapshot: snapshot,
    purpose: 'holder-upgrade', confirmedVia: 'manual', paymentMethodType: 'manual',
  });
  try {
    await createOrUpdateInvoice({
      registrationId: doc._id, registrationModel: 'Airlines',
      paymentId: payment._id, snapshot, amountDollars: Number(group.amount),
      paidAt: now, paymentMethod: 'manual', existingInvoiceNumber: invoiceNum, purpose: 'holder-upgrade',
    });
  } catch (e) { console.warn('[adminHolderUpgrade] invoice create failed:', e.message); }
  return { invoiceNumber: invoiceNum, paymentId: payment._id };
}

// POST /api/airlines/:id/admin-holder-upgrade  (admin)
// Body: { plan, additionalCount, paid }
exports.adminHolderUpgrade = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
    const { plan, additionalCount, paid, mergeTarget } = req.body;
    const addCount = Number(additionalCount);
    if (!addCount || addCount < 1)
      return res.status(400).json({ success: false, message: 'additionalCount must be at least 1.' });
    const VALID = ['1 Year Subscription Plan', 'Unlimited Plan'];
    const batchPlan = VALID.includes(plan) ? plan : '1 Year Subscription Plan';

    const doc = await Airlines.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Airline not found.' });

    const now = new Date();
    const currentCommitted = Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 0);
    // committedCount keeps the invariant (base + all not-expired groups), so the new
    // stored total just adds the purchased slots. The pricing TIER, however, is based
    // on the current base slots (excludes previous-period upgrade plans) so a stale
    // leftover plan can't bump the airline into a higher/lower tier.
    const newCommitted = currentCommitted + addCount;
    const tierBasis    = currentBaseSlots(doc, now) + addCount;
    const ppc          = tierPpcForPlan(batchPlan, Math.max(3, tierBasis));
    const amount       = ppc * addCount;
    const expiry   = computeExpiry(batchPlan, now, null);

    // Resolve a valid merge target (must be the SAME plan type as the batch).
    let mergeBase = false;
    let mergeGroup = null;
    if (mergeTarget === 'base' && doc.subscriptionPlan === batchPlan) {
      mergeBase = true;
    } else if (mergeTarget && mergeTarget !== 'base') {
      const tg = doc.holderGroups.id(mergeTarget);
      if (tg && tg.plan === batchPlan) mergeGroup = tg;
    }

    doc.committedCount   = newCommitted;
    doc.holderCountValue = String(newCommitted);
    // Only re-rate the BASE plan when these holders actually merge INTO the base.
    // A separate add-on (even same plan type) keeps its own rate and must NOT change
    // the per-cert price the airline already paid for the base.
    if (mergeBase) doc.pricePerCertificate = ppc;

    let group; // the unit to invoice against (real group for separate; pseudo for merge)
    if (mergeBase) {
      // Grow base capacity — merged holders inherit base plan/dates. No new group.
      group = { plan: batchPlan, count: addCount, pricePerCert: ppc, amount, subscriptionDate: now };
    } else if (mergeGroup) {
      // Grow target group capacity — merged holders inherit its dates. No new group.
      mergeGroup.count = Number(mergeGroup.count || 0) + addCount;
      group = { plan: batchPlan, count: addCount, pricePerCert: ppc, amount, subscriptionDate: now };
    } else {
      // Separate independent plan (default) — own full-length term.
      doc.holderGroups.push({
        plan: batchPlan, count: addCount, pricePerCert: ppc, amount,
        subscriptionDate: now, expirationDate: expiry || null,
        paymentStatus: paid ? 'paid' : 'pending', addedByAdmin: true,
      });
    }
    await doc.save();
    if (!mergeBase && !mergeGroup) group = doc.holderGroups[doc.holderGroups.length - 1];

    if (paid) {
      const { invoiceNumber, paymentId } = await createGroupInvoiceAndPayment(doc, group);
      // Only a real (separate) group stores invoice/payment refs on itself.
      if (!mergeBase && !mergeGroup) {
        group.invoiceNumber = invoiceNumber;
        group.paymentId     = paymentId;
        await doc.save();
      }
    }
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[adminHolderUpgrade]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/airlines/:id/holder-group/:groupId/mark-paid  (admin)
// Generates the invoice for a pending admin-added group and marks it paid.
exports.markHolderGroupPaid = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
    const doc = await Airlines.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Airline not found.' });
    const group = doc.holderGroups.id(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, message: 'Holder group not found.' });
    if (group.paymentStatus === 'paid')
      return res.json({ success: true, data: doc, alreadyPaid: true });

    const { invoiceNumber, paymentId } = await createGroupInvoiceAndPayment(doc, group);
    group.paymentStatus = 'paid';
    group.invoiceNumber = invoiceNumber;
    group.paymentId     = paymentId;
    await doc.save();
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[markHolderGroupPaid]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── Admin manual RENEWAL (no Stripe) ─────────────────────────────────────────
/**
 * adminRenew
 *
 * Lets an admin renew a subscription (base plan OR a holder-upgrade group) on a
 * customer's behalf WITHOUT taking payment. Reuses the exact same application
 * logic as a paid renewal (applyRenewalToRegistration / applyGroupRenewal) so the
 * queued-vs-immediate behaviour, Renewal docs and registration fields are
 * identical to the Stripe path — only the Payment doc is synthetic (manual).
 *
 * Admin controls everything via the body:
 *   plan, multiYearCount, exactCount (airline), holdersToRemove, holderGroupId,
 *   price (overrides computed amount), invoiceNumber (custom, must be unique).
 *
 * Route: POST /api/airlines/:id/admin-renew  and  /api/individuals/:id/admin-renew
 */
exports.adminRenew = async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Admin only.' });

    const registrationId    = req.params.id || req.body.registrationId;
    const registrationModel = req.body.registrationModel
      || (req.baseUrl.includes('individuals') ? 'Individual' : 'Airlines');
    const { plan, multiYearCount, exactCount, holdersToRemove, holderGroupId, price, invoiceNumber } = req.body;

    const VALID_MODELS = ['Individual', 'Airlines', 'AirlinesSubscription'];
    if (!registrationId || !VALID_MODELS.includes(registrationModel))
      return res.status(400).json({ success: false, message: 'Valid registrationId and registrationModel are required.' });

    const { doc } = await findRegistration(registrationId, registrationModel);
    if (!doc) return res.status(404).json({ success: false, message: 'Registration not found.' });

    const isAirline = registrationModel !== 'Individual';
    const now = new Date();

    // ── Resolve the plan + holder/year counts being renewed ───────────────────
    const group = holderGroupId && doc.holderGroups?.id ? doc.holderGroups.id(holderGroupId) : null;
    if (holderGroupId && !group)
      return res.status(404).json({ success: false, message: 'Holder group not found.' });

    const currentPlan = group ? group.plan : doc.subscriptionPlan;
    const activePlan  = plan || currentPlan;
    // Block only when the CURRENT plan is already Unlimited (no expiry to extend).
    // Upgrading FROM 1 Year/Multi-Year TO Unlimited at renewal IS allowed — it just
    // sets the new plan with no expiry (same as the paid Stripe renewal flow).
    if (currentPlan === 'Unlimited Plan')
      return res.status(400).json({ success: false, message: 'Already on Unlimited — it never expires, nothing to renew.' });

    const yearsVal = activePlan === 'Multiple Years Subscription Plan'
      ? Math.max(2, Number(multiYearCount) || Number(doc.multiYearCount) || 2)
      : null;

    const count = group
      ? (exactCount ? Number(exactCount) : Number(group.count || 1))
      : (exactCount ? Number(exactCount) : Number(doc.committedCount || doc.holderCountValue || doc.certificateHolders?.length || 1));

    // A group add-on stacks on the active base — its tier is read at the cumulative
    // position (anchor + count), matching applyGroupRenewal() and the frontend.
    const tierAnchor = group ? renewTierAnchor(doc, group, now) : 0;
    const tierCount  = Math.max(3, tierAnchor + count);

    // ── Amount: admin override, else computed from tier/plan pricing ──────────
    let amountDollars = Number(price);
    if (!(amountDollars > 0)) {
      if (isAirline) {
        // tierPpcForPlan returns UNLIMITED tier pricing when activePlan is Unlimited.
        const ppc = tierPpcForPlan(activePlan, tierCount);
        amountDollars = ppc * count * (yearsVal || 1);
      } else {
        amountDollars = activePlan === 'Unlimited Plan'
          ? 299
          : activePlan === 'Multiple Years Subscription Plan'
            ? 55 * (yearsVal || 2)
            : 69; // 1 Year
      }
    }
    amountDollars = Math.round(amountDollars * 100) / 100;

    // ── Invoice number: admin-supplied (must be unique) or freshly generated ──
    let invoiceNum = normalizeInvoiceNumber(invoiceNumber);
    if (invoiceNum) {
      if (await isInvoiceNumberTaken(invoiceNum))
        return res.status(400).json({ success: false, message: 'Invoice number already exists. Please use a different value.' });
    } else {
      invoiceNum = await generateInvoiceNumber();
    }

    // ── Build the invoice snapshot for the renewed period ─────────────────────
    const baseExpiry = group
      ? (group.expirationDate ? new Date(group.expirationDate) : null)
      : (doc.expirationDate ? new Date(doc.expirationDate) : null);
    const renewalBase = baseExpiry && baseExpiry > now ? baseExpiry : now;
    const ppcForSnap = isAirline ? tierPpcForPlan(activePlan, tierCount) : 0;
    const snapDocObj = {
      ...doc.toObject(),
      subscriptionPlan: activePlan,
      multiYearCount:   yearsVal,
      price:            amountDollars,
      committedCount:   count,
      holderCountValue: String(count),
      ...(isAirline ? { pricePerCertificate: ppcForSnap, pricePerCert: ppcForSnap } : {}),
    };
    const snapshot = buildInvoiceSnapshot(snapDocObj, registrationModel, amountDollars, renewalBase);

    // ── Synthetic (manual) Payment doc — drives the same renewal application ──
    const paymentDoc = await Payment.create({
      stripePaymentIntentId: `MANUAL-RENEW-${invoiceNum}`,
      status:           'succeeded',
      isPaid:           true,
      paidAt:           now,
      amountCents:      Math.round(amountDollars * 100),
      amountDollars,
      currency:         'usd',
      registrationId,
      registrationModel,
      invoiceNumber:    invoiceNum,
      invoiceSnapshot:  snapshot,
      purpose:          'renewal',
      confirmedVia:     'manual',
      paymentMethodType:'manual',
      newSubscriptionPlan:    plan || null,
      renewalMultiYearCount:  yearsVal,
      renewalExactCount:      isAirline ? count : null,
      renewalHoldersToRemove: Array.isArray(holdersToRemove) && holdersToRemove.length ? holdersToRemove : null,
    });

    // ── Apply renewal — identical path to the paid Stripe flow ────────────────
    const updatedReg = holderGroupId
      ? await applyGroupRenewal(registrationId, registrationModel, paymentDoc, holderGroupId)
      : await applyRenewalToRegistration(registrationId, registrationModel, paymentDoc);

    // ── Canonical Invoice doc (purpose renewal, manual) ───────────────────────
    try {
      await createOrUpdateInvoice({
        registrationId,
        registrationModel,
        paymentId:             paymentDoc._id,
        snapshot,
        amountDollars,
        paidAt:                now,
        paymentMethod:         'manual',
        existingInvoiceNumber: invoiceNum,
        purpose:               'renewal',
      });
    } catch (invErr) {
      console.warn('[adminRenew] Invoice creation failed:', invErr.message);
    }

    return res.json({ success: true, data: updatedReg, invoiceNumber: invoiceNum, amount: amountDollars });
  } catch (err) {
    console.error('[adminRenew]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};


// ─── POST /api/payments/admin/refresh-invoice ─────────────────────────────────
// Admin-only: force-refresh the canonical Invoice doc for a registration by
// re-running updateOriginalInvoiceAfterHolderUpgrade with the current DB state.
// Fixes invoices that were created before the holder-upgrade draft-refresh fix.
exports.refreshInvoice = async (req, res) => {
  try {
    const { registrationId, registrationModel } = req.body;
    if (!registrationId || !registrationModel)
      return res.status(400).json({ success: false, message: 'registrationId and registrationModel are required.' });

    const { doc } = await findRegistration(registrationId, registrationModel);
    if (!doc)
      return res.status(404).json({ success: false, message: 'Registration not found.' });

    await updateOriginalInvoiceAfterHolderUpgrade(registrationId, registrationModel, doc);
    return res.json({ success: true, message: 'Invoice refreshed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


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


// ─── POST /api/payments/admin/cancel-renewal (admin) ──────────────────────────
// Admin-only: remove a queued (not-yet-active) renewal from a registration. Drops
// the standalone Renewal doc, clears the nextRenewal fields, and removes/hides the
// queued renewal invoice so it disappears for both admin and the customer.
exports.cancelQueuedRenewal = async (req, res) => {
  try {
    const { registrationId, registrationModel } = req.body;
    if (!registrationId || !registrationModel)
      return res.status(400).json({ success: false, message: 'registrationId and registrationModel are required.' });

    const { doc, Model } = await findRegistration(registrationId, registrationModel);
    if (!doc || !Model)
      return res.status(404).json({ success: false, message: 'Registration not found.' });

    if (!doc.nextRenewal?.paidAt)
      return res.status(400).json({ success: false, message: 'No queued renewal found on this record.' });

    const queuedInvoice = doc.nextRenewal?.invoiceNumber;

    // Remove the standalone Renewal doc(s) backing this queued renewal.
    if (doc.nextRenewalId) await Renewal.findByIdAndDelete(doc.nextRenewalId);
    if (queuedInvoice) await Renewal.deleteMany({ registrationId, invoiceNumber: queuedInvoice });

    // Remove the queued renewal's invoice and hide its number so it never resurfaces.
    if (queuedInvoice) {
      const Invoice = require('../models/Invoice');
      await Invoice.deleteMany({ registrationId, invoiceNumber: queuedInvoice });
    }

    const update = {
      $set: {
        nextRenewalId: null,
        'nextRenewal.paidAt': null,
        'nextRenewal.plan': null,
        'nextRenewal.activationDate': null,
        'nextRenewal.expiresAt': null,
        'nextRenewal.invoiceNumber': null,
        'nextRenewal.price': null,
        'nextRenewal.multiYearCount': null,
        'nextRenewal.committedCount': null,
        'nextRenewal.holdersToRemove': null,
      },
    };
    if (queuedInvoice)
      update.$addToSet = { hiddenInvoiceNumbers: normalizeInvoiceNumber(queuedInvoice) };

    const updated = await Model.findByIdAndUpdate(registrationId, update, { new: true });
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

    const now = new Date();
    const nr = doc.nextRenewal;
    const baseDue = !!(nr?.paidAt && (!nr.activationDate || new Date(nr.activationDate) <= now));
    const groupDue = (doc.holderGroups || []).some(
      g => g.nextRenewal?.paidAt && g.nextRenewal.activationDate && new Date(g.nextRenewal.activationDate) <= now,
    );

    if (!baseDue && !groupDue)
      return res.status(400).json({ success: false, message: 'No queued renewal ready to activate.' });

    let updated = doc;
    // Activate due group renewals first (mutates + saves the same doc).
    if (groupDue) updated = await performQueuedGroupRenewals(doc, Model);
    // Then the base-plan renewal, re-fetching to pick up any group changes.
    if (baseDue) {
      const fresh = await Model.findById(doc._id);
      updated = await performQueuedRenewalActivation(fresh, Model, registrationModel, false);
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/payments/admin/send-renewal-reminders (admin) ─────────────────
exports.sendRenewalReminders = async (req, res) => {
  try {
    const { recipients } = req.body;
    if (!Array.isArray(recipients) || recipients.length === 0)
      return res.status(400).json({ success: false, message: 'recipients array required.' });

    const { sendExpiryReminder } = require('../services/emailService');
    let sent = 0, failed = 0;

    for (const { registrationId, registrationModel } of recipients) {
      try {
        const { doc } = await findRegistration(registrationId, registrationModel);
        if (!doc) { failed++; continue; }
        const isAirline = registrationModel !== 'Individual';
        const daysLeft = doc.expirationDate
          ? Math.max(0, Math.ceil((new Date(doc.expirationDate) - new Date()) / (1000 * 60 * 60 * 24)))
          : 30;
        await sendExpiryReminder(doc, isAirline, daysLeft);
        sent++;
      } catch (e) {
        console.warn('[sendRenewalReminders] email failed:', e.message);
        failed++;
      }
    }

    res.json({ success: true, sent, failed });
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

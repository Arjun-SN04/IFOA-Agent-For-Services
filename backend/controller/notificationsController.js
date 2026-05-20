const User = require('../models/User');
const Airlines = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');
const Individual = require('../models/Individual');
const HolderEvent = require('../models/HolderEvent');

function daysUntil(dateVal) {
  if (!dateVal) return null;
  const now = new Date();
  const d = new Date(dateVal);
  const ms = d.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function uniqueIds(arr) {
  return [...new Set((arr || []).filter(Boolean).map(String))];
}

function sortByCreatedDesc(items) {
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function toIso(value) {
  try {
    return new Date(value).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function getAdminNotifications(limit) {
  // 1. Wire payment requests — highest priority
  const wireRequested = await Airlines.find({
    wirePaymentRequested: true,
    paymentStatus: 'pending',
    invoiceGenerated: { $ne: true },
  })
    .sort({ wirePaymentRequestedAt: -1, createdAt: -1 })
    .limit(limit)
    .select('airlineName firstName lastName subscriptionPlan wirePaymentRequestedAt createdAt _id');

  const wireNotifs = wireRequested.map((row) => {
    const requestedAt = row.wirePaymentRequestedAt || row.createdAt || new Date();
    const who = row.airlineName || [row.firstName, row.lastName].filter(Boolean).join(' ') || 'Airline account';
    return {
      id: `wire-${row._id}-${new Date(requestedAt).getTime()}`,
      type: 'wire-request',
      title: 'Wire Payment Request',
      message: `${who} requested a wire-transfer invoice for ${row.subscriptionPlan || 'a subscription plan'}.`,
      createdAt: toIso(requestedAt),
      severity: 'high',
      link: '/admin/airlines',
      entityId: String(row._id),
    };
  });

  // 2. New airline registrations (last 48 hours, unpaid)
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const newAirlines = await Airlines.find({
    createdAt: { $gte: cutoff48h },
    paymentStatus: { $ne: 'paid' },
    wirePaymentRequested: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('airlineName firstName lastName subscriptionPlan createdAt _id');

  const newAirlineNotifs = newAirlines.map((row) => {
    const who = row.airlineName || [row.firstName, row.lastName].filter(Boolean).join(' ') || 'An airline';
    return {
      id: `new-airline-${row._id}`,
      type: 'new-registration',
      title: 'New Airline Registration',
      message: `${who} submitted a new registration for ${row.subscriptionPlan || 'a plan'}. Awaiting payment.`,
      createdAt: toIso(row.createdAt),
      severity: 'info',
      link: '/admin/airlines',
      entityId: String(row._id),
    };
  });

  // 3. New individual registrations (last 48 hours, unpaid)
  const newIndividuals = await Individual.find({
    createdAt: { $gte: cutoff48h },
    paymentStatus: { $ne: 'paid' },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('firstName lastName subscriptionPlan createdAt _id');

  const newIndividualNotifs = newIndividuals.map((row) => {
    const who = [row.firstName, row.lastName].filter(Boolean).join(' ') || 'An individual';
    return {
      id: `new-individual-${row._id}`,
      type: 'new-registration',
      title: 'New Individual Registration',
      message: `${who} submitted a new registration for ${row.subscriptionPlan || 'a plan'}. Awaiting payment.`,
      createdAt: toIso(row.createdAt),
      severity: 'info',
      link: '/admin/individuals',
      entityId: String(row._id),
    };
  });

  // 4. Recently paid airlines (last 24 hours) — payment confirmed
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const paidAirlines = await Airlines.find({
    paymentStatus: 'paid',
    updatedAt: { $gte: cutoff24h },
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('airlineName firstName lastName subscriptionPlan updatedAt _id');

  const paidAirlineNotifs = paidAirlines.map((row) => {
    const who = row.airlineName || [row.firstName, row.lastName].filter(Boolean).join(' ') || 'An airline';
    return {
      id: `paid-airline-${row._id}`,
      type: 'payment-confirmed',
      title: 'Payment Confirmed — Airline',
      message: `${who} completed payment for ${row.subscriptionPlan || 'a plan'}.`,
      createdAt: toIso(row.updatedAt),
      severity: 'success',
      link: '/admin/airlines',
      entityId: String(row._id),
    };
  });

  // 5. Recently paid individuals (last 24 hours)
  const paidIndividuals = await Individual.find({
    paymentStatus: 'paid',
    updatedAt: { $gte: cutoff24h },
  })
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('firstName lastName subscriptionPlan updatedAt _id');

  const paidIndividualNotifs = paidIndividuals.map((row) => {
    const who = [row.firstName, row.lastName].filter(Boolean).join(' ') || 'An individual';
    return {
      id: `paid-individual-${row._id}`,
      type: 'payment-confirmed',
      title: 'Payment Confirmed — Individual',
      message: `${who} completed payment for ${row.subscriptionPlan || 'a plan'}.`,
      createdAt: toIso(row.updatedAt),
      severity: 'success',
      link: '/admin/individuals',
      entityId: String(row._id),
    };
  });

  // 6. Subscriptions expiring in next 14 days
  const in14days = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const expiringAirlines = await Airlines.find({
    expirationDate: { $gte: new Date(), $lte: in14days },
    paymentStatus: 'paid',
  })
    .sort({ expirationDate: 1 })
    .limit(5)
    .select('airlineName firstName lastName subscriptionPlan expirationDate _id');

  const expiringAirlineNotifs = expiringAirlines.map((row) => {
    const who = row.airlineName || [row.firstName, row.lastName].filter(Boolean).join(' ') || 'An airline';
    const days = daysUntil(row.expirationDate);
    return {
      id: `expiring-airline-${row._id}`,
      type: 'expiry-soon',
      title: 'Airline Subscription Expiring',
      message: `${who}\'s subscription expires in ${days} day${days === 1 ? '' : 's'}.`,
      createdAt: toIso(row.expirationDate),
      severity: 'warn',
      link: '/admin/airlines',
      entityId: String(row._id),
    };
  });

  const expiringIndividuals = await Individual.find({
    expirationDate: { $gte: new Date(), $lte: in14days },
    paymentStatus: 'paid',
  })
    .sort({ expirationDate: 1 })
    .limit(5)
    .select('firstName lastName subscriptionPlan expirationDate _id');

  const expiringIndividualNotifs = expiringIndividuals.map((row) => {
    const who = [row.firstName, row.lastName].filter(Boolean).join(' ') || 'An individual';
    const days = daysUntil(row.expirationDate);
    return {
      id: `expiring-individual-${row._id}`,
      type: 'expiry-soon',
      title: 'Individual Subscription Expiring',
      message: `${who}\'s subscription expires in ${days} day${days === 1 ? '' : 's'}.`,
      createdAt: toIso(row.expirationDate),
      severity: 'warn',
      link: '/admin/individuals',
      entityId: String(row._id),
    };
  });

  // 7. Holder events (removed / converted) — always show unresolved ones
  const holderEvents = await HolderEvent.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const holderEventNotifs = holderEvents.map((ev) => {
    const isRemoved   = ev.type === 'holder-removed';
    const isConverted = ev.type === 'holder-converted';
    const pending     = isRemoved && ev.status === 'pending-contact';

    return {
      id:          `holder-event-${ev._id}`,
      type:        ev.type,
      title:       isRemoved
        ? (pending ? 'Holder Removed — Contact Required' : 'Holder Removed')
        : 'Holder Converted to Individual',
      message:     isRemoved
        ? `${ev.airlineName} removed holder ${ev.holderName}${ev.holderEmail ? ` (${ev.holderEmail})` : ''}. ${pending ? 'Contact them regarding continued subscription.' : `Status: ${ev.status}.`}`
        : `${ev.airlineName} converted holder ${ev.holderName}${ev.holderEmail ? ` (${ev.holderEmail})` : ''} to an Individual account.`,
      createdAt:   toIso(ev.createdAt),
      severity:    pending ? 'high' : (isConverted ? 'success' : 'info'),
      link:        '/admin/airlines',
      entityId:    String(ev.airlineId),
      holderEventId: String(ev._id),
      holderEventStatus: ev.status,
      holderEmail:   ev.holderEmail,
      holderName:    ev.holderName,
      convertedIndividualId: ev.convertedIndividualId ? String(ev.convertedIndividualId) : null,
    };
  });

  // Merge: wire requests always first, then by recency
  const all = [
    ...wireNotifs,
    ...holderEventNotifs,
    ...newAirlineNotifs,
    ...newIndividualNotifs,
    ...paidAirlineNotifs,
    ...paidIndividualNotifs,
    ...expiringAirlineNotifs,
    ...expiringIndividualNotifs,
  ];

  // De-duplicate by id
  const seen = new Set();
  const deduped = all.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  // Sort: high severity first, then by date desc
  const severityOrder = { high: 0, warn: 1, success: 2, info: 3 };
  deduped.sort((a, b) => {
    const sa = severityOrder[a.severity] ?? 4;
    const sb = severityOrder[b.severity] ?? 4;
    if (sa !== sb) return sa - sb;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return deduped.slice(0, limit);
}

async function getAirlineNotifications(user, limit) {
  const ids = uniqueIds([...(user.subscriptionIds || []), user.registrationId]);

  let docs = [];
  if (ids.length > 0) {
    docs = await Airlines.find({ _id: { $in: ids } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('subscriptionPlan paymentStatus status wirePaymentRequested wirePaymentRequestedAt expirationDate createdAt _id');
  }

  if (docs.length === 0) {
    docs = await Airlines.find({ email: user.email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('subscriptionPlan paymentStatus status wirePaymentRequested wirePaymentRequestedAt expirationDate createdAt _id');
  }

  const out = [];
  docs.forEach((s) => {
    const baseDate = s.wirePaymentRequestedAt || s.createdAt || new Date();

    if (s.wirePaymentRequested && s.paymentStatus !== 'paid') {
      out.push({
        id: `airline-wire-${s._id}`,
        type: 'wire-pending',
        title: 'Wire Request Submitted',
        message: `Your wire-transfer invoice request for ${s.subscriptionPlan || 'this plan'} is pending admin review. You\'ll be contacted with payment instructions.`,
        createdAt: toIso(baseDate),
        severity: 'info',
        link: '/dashboard/subscription',
      });
    }

    if (s.paymentStatus !== 'paid' && s.status !== 'Active' && !s.wirePaymentRequested) {
      out.push({
        id: `airline-payment-${s._id}`,
        type: 'payment-pending',
        title: 'Payment Required',
        message: `Complete card payment to activate your ${s.subscriptionPlan || 'subscription'} and receive your certificate.`,
        createdAt: toIso(s.createdAt || new Date()),
        severity: 'warn',
        link: '/dashboard/subscription',
      });
    }

    if (s.paymentStatus === 'paid' || s.status === 'Active') {
      out.push({
        id: `airline-active-${s._id}`,
        type: 'subscription-active',
        title: 'Subscription Active',
        message: `${s.subscriptionPlan || 'Your subscription'} is active. Your U.S. Agent for Service is registered.`,
        createdAt: toIso(s.createdAt || new Date()),
        severity: 'success',
        link: '/dashboard/subscription',
      });
    }

    const d = daysUntil(s.expirationDate);
    if (d != null && d >= 0 && d <= 30) {
      out.push({
        id: `airline-expiry-${s._id}`,
        type: 'expiry-soon',
        title: d <= 7 ? 'Urgent — Expiring Soon' : 'Expiration Reminder',
        message: `Your ${s.subscriptionPlan || 'subscription'} expires in ${d} day${d === 1 ? '' : 's'}. Renew now to stay FAA-compliant.`,
        createdAt: toIso(s.expirationDate),
        severity: d <= 7 ? 'high' : 'warn',
        link: '/dashboard/subscription',
      });
    }

    // Invoice ready reminder
    if (s.invoiceGenerated && (s.paymentStatus === 'paid' || s.status === 'Active')) {
      out.push({
        id: `airline-invoice-${s._id}`,
        type: 'invoice-ready',
        title: 'Invoice Available',
        message: `Your invoice for ${s.subscriptionPlan || 'your plan'} is ready. Download it from your subscription page.`,
        createdAt: toIso(s.updatedAt || s.createdAt || new Date()),
        severity: 'info',
        link: '/dashboard/documents',
      });
    }
  });

  // Holder events for this airline — show converted notifications so airline is informed
  if (ids.length > 0) {
    const airlineHolderEvents = await HolderEvent.find({
      airlineId: { $in: ids },
      type: 'holder-converted',
      performedBy: 'admin', // only events where admin did the conversion (not airline-initiated)
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    for (const ev of airlineHolderEvents) {
      out.push({
        id:       `airline-holder-converted-${ev._id}`,
        type:     'holder-converted-by-admin',
        title:    'Holder Converted to Individual',
        message:  `${ev.holderName}${ev.holderEmail ? ` (${ev.holderEmail})` : ''} has been converted to an individual subscriber and now has their own account.`,
        createdAt: toIso(ev.createdAt),
        severity:  'info',
        link:      '/dashboard/subscription',
      });
    }
  }

  return sortByCreatedDesc(out).slice(0, limit);
}

async function getIndividualNotifications(user, limit) {
  const ids = uniqueIds([...(user.subscriptionIds || []), user.registrationId]);

  let docs = [];
  if (ids.length > 0) {
    docs = await Individual.find({ _id: { $in: ids } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('subscriptionPlan paymentStatus status expirationDate createdAt _id');
  }

  if (docs.length === 0) {
    docs = await Individual.find({ email: user.email })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('subscriptionPlan paymentStatus status expirationDate createdAt _id');
  }

  const out = [];
  docs.forEach((s) => {
    if (s.paymentStatus !== 'paid' && s.status !== 'Active') {
      out.push({
        id: `individual-payment-${s._id}`,
        type: 'payment-pending',
        title: 'Payment Required',
        message: `Complete payment to activate your ${s.subscriptionPlan || 'subscription'} and receive your FAA compliance certificate.`,
        createdAt: toIso(s.createdAt || new Date()),
        severity: 'warn',
        link: '/dashboard/subscription',
      });
    }

    if (s.paymentStatus === 'paid' || s.status === 'Active') {
      out.push({
        id: `individual-active-${s._id}`,
        type: 'subscription-active',
        title: 'Subscription Active',
        message: `${s.subscriptionPlan || 'Your subscription'} is active. IFOA USA is your registered U.S. Agent for Service.`,
        createdAt: toIso(s.createdAt || new Date()),
        severity: 'success',
        link: '/dashboard/subscription',
      });
    }

    const d = daysUntil(s.expirationDate);
    if (d != null && d >= 0 && d <= 30) {
      out.push({
        id: `individual-expiry-${s._id}`,
        type: 'expiry-soon',
        title: d <= 7 ? 'Urgent — Expiring Soon' : 'Expiration Reminder',
        message: `Your ${s.subscriptionPlan || 'subscription'} expires in ${d} day${d === 1 ? '' : 's'}. Renew to maintain FAA compliance.`,
        createdAt: toIso(s.expirationDate),
        severity: d <= 7 ? 'high' : 'warn',
        link: '/dashboard/subscription',
      });
    }

    // Invoice ready
    if (s.invoiceGenerated && (s.paymentStatus === 'paid' || s.status === 'Active')) {
      out.push({
        id: `individual-invoice-${s._id}`,
        type: 'invoice-ready',
        title: 'Invoice Available',
        message: `Your invoice for ${s.subscriptionPlan || 'your plan'} is ready. Download it from your documents page.`,
        createdAt: toIso(s.updatedAt || s.createdAt || new Date()),
        severity: 'info',
        link: '/dashboard/documents',
      });
    }
  });

  return sortByCreatedDesc(out).slice(0, limit);
}

exports.getNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const user = await User.findById(req.user.id).select('email role registrationId subscriptionIds');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let notifications = [];
    if (user.role === 'admin') {
      notifications = await getAdminNotifications(limit);
    } else if (user.role === 'airline') {
      notifications = await getAirlineNotifications(user, limit);
    } else {
      notifications = await getIndividualNotifications(user, limit);
    }

    return res.json({
      success: true,
      notifications,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to load notifications.' });
  }
};

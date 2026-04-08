const User = require('../models/User');
const Airlines = require('../models/Airlines');
const AirlinesSubscription = require('../models/AirlinesSubscription');
const Individual = require('../models/Individual');

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
  const wireRequested = await Airlines.find({
    wirePaymentRequested: true,
    paymentStatus: 'pending',
    invoiceGenerated: { $ne: true },
  })
    .sort({ wirePaymentRequestedAt: -1, createdAt: -1 })
    .limit(limit)
    .select('airlineName firstName lastName subscriptionPlan wirePaymentRequestedAt createdAt _id');

  return wireRequested.map((row) => {
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
        message: `Your wire-transfer invoice request for ${s.subscriptionPlan || 'this plan'} is pending admin review.`,
        createdAt: toIso(baseDate),
        severity: 'info',
        link: '/dashboard/subscription',
      });
    }

    if (s.paymentStatus !== 'paid' && s.status !== 'Active' && !s.wirePaymentRequested) {
      out.push({
        id: `airline-payment-${s._id}`,
        type: 'payment-pending',
        title: 'Payment Pending',
        message: `Complete card payment to activate your ${s.subscriptionPlan || 'subscription'}.`,
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
        message: `${s.subscriptionPlan || 'Your subscription'} is active.`,
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
        title: 'Expiration Reminder',
        message: `Your ${s.subscriptionPlan || 'subscription'} expires in ${d} day${d === 1 ? '' : 's'}.`,
        createdAt: toIso(s.expirationDate),
        severity: 'warn',
        link: '/dashboard/subscription',
      });
    }
  });

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
        title: 'Payment Pending',
        message: `Complete payment to activate your ${s.subscriptionPlan || 'subscription'}.`,
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
        message: `${s.subscriptionPlan || 'Your subscription'} is active.`,
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
        title: 'Expiration Reminder',
        message: `Your ${s.subscriptionPlan || 'subscription'} expires in ${d} day${d === 1 ? '' : 's'}.`,
        createdAt: toIso(s.expirationDate),
        severity: 'warn',
        link: '/dashboard/subscription',
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

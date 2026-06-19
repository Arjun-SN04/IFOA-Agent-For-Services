/**
 * supportService.js
 *
 * Shared logic for the human ↔ admin live-chat. Used by BOTH the REST controller
 * (supportController.js) and the Socket.IO handlers (socket/supportSocket.js) so
 * persistence + real-time fan-out never diverge.
 *
 * Real-time fan-out (when an `io` instance is passed):
 *   - support:message       → new message  (to the conversation's user + all admins)
 *   - support:conversation  → updated conversation summary (list reorder + unread badges)
 */
const SupportConversation = require('../models/SupportConversation');
const SupportMessage      = require('../models/SupportMessage');
const User                = require('../models/User');
const Airlines            = require('../models/Airlines');

// ── Rooms ───────────────────────────────────────────────────────────────────
const ADMIN_ROOM = 'support:admins';
const userRoom = (userId) => `support:user:${String(userId)}`;

// ── Display name for a conversation, derived from the User account ────────────
function deriveName(userDoc) {
  if (!userDoc) return 'User';
  if (userDoc.role === 'airline') {
    return (userDoc.airlineName || '').trim()
      || [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim()
      || userDoc.email
      || 'Airline';
  }
  return [userDoc.firstName, userDoc.lastName].filter(Boolean).join(' ').trim()
    || userDoc.email
    || 'Individual';
}

// Trimmed summary used by the admin list + unread badges.
function summarize(conv) {
  return {
    _id:             conv._id,
    user:            conv.user,
    role:            conv.role,
    name:            conv.name,
    email:           conv.email,
    logoUrl:         conv.logoUrl || '',
    lastMessageBody: conv.lastMessageBody,
    lastMessageAt:   conv.lastMessageAt,
    lastSenderRole:  conv.lastSenderRole,
    adminUnread:     conv.adminUnread,
    userUnread:      conv.userUnread,
    updatedAt:       conv.updatedAt,
  };
}

/**
 * Get (or lazily create) the single conversation for an airline/individual user.
 */
async function getOrCreateConversation(userId) {
  let conv = await SupportConversation.findOne({ user: userId });
  if (conv) return conv;

  const userDoc = await User.findById(userId).lean();
  if (!userDoc || userDoc.role === 'admin') {
    throw Object.assign(new Error('Only airline/individual users have a support conversation.'), { status: 400 });
  }
  let logoUrl = '';
  if (userDoc.role === 'airline') {
    const airline = await Airlines.findOne({ email: userDoc.email }).select('logoUrl').lean();
    logoUrl = airline?.logoUrl || '';
  }
  conv = await SupportConversation.create({
    user:    userId,
    role:    userDoc.role,
    name:    deriveName(userDoc),
    email:   userDoc.email || '',
    logoUrl,
  });
  return conv;
}

/**
 * Admin list of conversations, optionally filtered by role, newest activity first.
 */
async function listConversations({ role } = {}) {
  const query = {};
  if (role === 'airline' || role === 'individual') query.role = role;
  const convs = await SupportConversation.find(query)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();

  // Back-fill logoUrl for airline convs that predate this field
  const missing = convs.filter(c => c.role === 'airline' && !c.logoUrl && c.email);
  if (missing.length > 0) {
    const emails = [...new Set(missing.map(c => c.email))];
    const airlines = await Airlines.find({ email: { $in: emails } }).select('email logoUrl').lean();
    const logoByEmail = {};
    for (const a of airlines) if (a.logoUrl) logoByEmail[a.email] = a.logoUrl;
    const updates = missing.filter(c => logoByEmail[c.email]);
    // Fire-and-forget saves so the response isn't delayed
    if (updates.length > 0) {
      SupportConversation.bulkWrite(updates.map(c => ({
        updateOne: { filter: { _id: c._id }, update: { $set: { logoUrl: logoByEmail[c.email] } } },
      }))).catch(() => {});
      // Patch the in-memory results so admin sees it immediately
      for (const c of convs) {
        if (c.role === 'airline' && logoByEmail[c.email]) c.logoUrl = logoByEmail[c.email];
      }
    }
  }

  return convs;
}

/**
 * Messages for a conversation, oldest → newest.
 */
async function getMessages(conversationId, { limit = 500 } = {}) {
  return SupportMessage.find({ conversation: conversationId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
}

/**
 * Persist a message, update the conversation preview + unread counter, and
 * (if io given) fan out in real time.
 */
async function createMessage({ conversation, senderRole, senderId, senderName, body, io }) {
  const text = String(body || '').trim();
  if (!text) throw Object.assign(new Error('Message body is required.'), { status: 400 });

  const message = await SupportMessage.create({
    conversation: conversation._id,
    senderRole,
    senderId,
    senderName,
    body: text,
  });

  conversation.lastMessageBody = text.slice(0, 200);
  conversation.lastMessageAt   = message.createdAt;
  conversation.lastSenderRole  = senderRole;
  if (senderRole === 'user') conversation.adminUnread += 1;
  else                       conversation.userUnread  += 1;
  await conversation.save();

  if (io) {
    const payload = { conversationId: String(conversation._id), message: message.toObject() };
    io.to(userRoom(conversation.user)).emit('support:message', payload);
    io.to(ADMIN_ROOM).emit('support:message', payload);
    const summary = summarize(conversation);
    io.to(userRoom(conversation.user)).emit('support:conversation', summary);
    io.to(ADMIN_ROOM).emit('support:conversation', summary);
  }

  return { conversation, message };
}

/**
 * Mark a conversation read for one side and clear its unread counter.
 */
async function markRead({ conversation, readerRole, io }) {
  if (readerRole === 'admin') conversation.adminUnread = 0;
  else                        conversation.userUnread  = 0;
  await conversation.save();

  if (io) {
    const summary = summarize(conversation);
    io.to(userRoom(conversation.user)).emit('support:conversation', summary);
    io.to(ADMIN_ROOM).emit('support:conversation', summary);
  }
  return conversation;
}

module.exports = {
  ADMIN_ROOM,
  userRoom,
  summarize,
  getOrCreateConversation,
  listConversations,
  getMessages,
  createMessage,
  markRead,
};

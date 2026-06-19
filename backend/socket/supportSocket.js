/**
 * supportSocket.js
 *
 * Socket.IO layer for the human ↔ admin live-chat. Authenticates every socket
 * with the same JWT used by the REST API, joins role-appropriate rooms, and
 * relays send/read events through supportService (single source of truth).
 *
 * Client → server events:
 *   support:send  { body }                          (user)   — message to support
 *   support:send  { conversationId, body }          (admin)  — reply to a user
 *   support:read  { conversationId? }                        — clear my unread
 *   support:typing{ conversationId?, typing }                — typing indicator
 *
 * Server → client events (see supportService): support:message, support:conversation,
 *   support:typing
 */
const jwt = require('jsonwebtoken');
const SupportConversation = require('../models/SupportConversation');
const support = require('../services/supportService');

const JWT_SECRET = process.env.JWT_SECRET;

function initSupportSocket(io) {
  // ── Auth handshake ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('No token provided'));
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded.mustChangePassword) return next(new Error('Password change required'));
      socket.user = decoded; // { id, email, role, ... }
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.user;

    if (role === 'admin') {
      socket.join(support.ADMIN_ROOM);
    } else {
      socket.join(support.userRoom(userId));
      // Ensure a conversation exists as soon as the user connects so admins see them.
      support.getOrCreateConversation(userId).catch(() => {});
    }

    // ── Send a message ──────────────────────────────────────────────────────
    socket.on('support:send', async (data, ack) => {
      try {
        const body = String(data?.body || '').trim();
        if (!body) return ack?.({ ok: false, error: 'Empty message' });

        let conversation;
        let senderRole;
        if (role === 'admin') {
          if (!data?.conversationId) return ack?.({ ok: false, error: 'conversationId required' });
          conversation = await SupportConversation.findById(data.conversationId);
          if (!conversation) return ack?.({ ok: false, error: 'Conversation not found' });
          senderRole = 'admin';
        } else {
          conversation = await support.getOrCreateConversation(userId);
          senderRole = 'user';
        }

        const senderName = role === 'admin' ? 'Support' : conversation.name;
        const { message } = await support.createMessage({
          conversation, senderRole, senderId: userId, senderName, body, io,
        });
        ack?.({ ok: true, message: message.toObject() });
      } catch (err) {
        ack?.({ ok: false, error: err.message || 'Send failed' });
      }
    });

    // ── Mark read ────────────────────────────────────────────────────────────
    socket.on('support:read', async (data) => {
      try {
        let conversation;
        if (role === 'admin') {
          if (!data?.conversationId) return;
          conversation = await SupportConversation.findById(data.conversationId);
        } else {
          conversation = await support.getOrCreateConversation(userId);
        }
        if (!conversation) return;
        await support.markRead({ conversation, readerRole: role === 'admin' ? 'admin' : 'user', io });
      } catch { /* non-critical */ }
    });

    // ── Typing indicator (ephemeral, not persisted) ──────────────────────────
    socket.on('support:typing', async (data) => {
      try {
        const typing = !!data?.typing;
        if (role === 'admin') {
          if (!data?.conversationId) return;
          const conv = await SupportConversation.findById(data.conversationId).select('user').lean();
          if (!conv) return;
          io.to(support.userRoom(conv.user)).emit('support:typing', {
            conversationId: String(data.conversationId), from: 'admin', typing,
          });
        } else {
          const conv = await support.getOrCreateConversation(userId);
          io.to(support.ADMIN_ROOM).emit('support:typing', {
            conversationId: String(conv._id), from: 'user', typing,
          });
        }
      } catch { /* non-critical */ }
    });
  });
}

module.exports = { initSupportSocket };

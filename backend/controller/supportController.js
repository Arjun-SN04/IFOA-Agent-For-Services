/**
 * supportController.js
 *
 * REST endpoints for the human ↔ admin live-chat. Sockets handle the real-time
 * path; these endpoints load history and provide a non-socket fallback for
 * sending / read receipts. All persistence flows through supportService so the
 * REST and Socket.IO paths stay consistent.
 *
 * User (airline/individual):
 *   GET  /api/support/me
 *   POST /api/support/me/messages   { body }
 *   POST /api/support/me/read
 *
 * Admin:
 *   GET  /api/support/conversations[?role=airline|individual]
 *   GET  /api/support/conversations/:id
 *   POST /api/support/conversations/:id/messages  { body }
 *   POST /api/support/conversations/:id/read
 */
const SupportConversation = require('../models/SupportConversation');
const support = require('../services/supportService');

const io = (req) => req.app.get('io');

// ── User: my conversation + history ───────────────────────────────────────────
exports.getMyConversation = async (req, res) => {
  try {
    if (req.user.role === 'admin')
      return res.status(403).json({ success: false, message: 'Admins use the conversations list.' });

    const conversation = await support.getOrCreateConversation(req.user.id);
    const messages = await support.getMessages(conversation._id);
    // Opening the panel clears the user's unread badge.
    if (conversation.userUnread > 0) {
      await support.markRead({ conversation, readerRole: 'user', io: io(req) });
    }
    res.json({ success: true, data: { conversation: support.summarize(conversation), messages } });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── User: send ────────────────────────────────────────────────────────────────
exports.sendMyMessage = async (req, res) => {
  try {
    if (req.user.role === 'admin')
      return res.status(403).json({ success: false, message: 'Admins reply via the conversation endpoint.' });

    const conversation = await support.getOrCreateConversation(req.user.id);
    const { message } = await support.createMessage({
      conversation,
      senderRole: 'user',
      senderId:   req.user.id,
      senderName: conversation.name,
      body:       req.body.body,
      io:         io(req),
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── User: mark read ───────────────────────────────────────────────────────────
exports.markMyRead = async (req, res) => {
  try {
    const conversation = await support.getOrCreateConversation(req.user.id);
    await support.markRead({ conversation, readerRole: 'user', io: io(req) });
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── Admin: list conversations ─────────────────────────────────────────────────
exports.listConversations = async (req, res) => {
  try {
    const conversations = await support.listConversations({ role: req.query.role });
    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: one conversation + history ─────────────────────────────────────────
exports.getConversation = async (req, res) => {
  try {
    const conversation = await SupportConversation.findById(req.params.id);
    if (!conversation)
      return res.status(404).json({ success: false, message: 'Conversation not found.' });

    const messages = await support.getMessages(conversation._id);
    if (conversation.adminUnread > 0) {
      await support.markRead({ conversation, readerRole: 'admin', io: io(req) });
    }
    res.json({ success: true, data: { conversation: support.summarize(conversation), messages } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: reply ──────────────────────────────────────────────────────────────
exports.replyToConversation = async (req, res) => {
  try {
    const conversation = await SupportConversation.findById(req.params.id);
    if (!conversation)
      return res.status(404).json({ success: false, message: 'Conversation not found.' });

    const { message } = await support.createMessage({
      conversation,
      senderRole: 'admin',
      senderId:   req.user.id,
      senderName: 'Support',
      body:       req.body.body,
      io:         io(req),
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ── Admin: mark read ──────────────────────────────────────────────────────────
exports.markConversationRead = async (req, res) => {
  try {
    const conversation = await SupportConversation.findById(req.params.id);
    if (!conversation)
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    await support.markRead({ conversation, readerRole: 'admin', io: io(req) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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
const SupportMessage      = require('../models/SupportMessage');
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

// ── Admin: edit a message ─────────────────────────────────────────────────────
exports.editMessage = async (req, res) => {
  try {
    const { id, msgId } = req.params;
    const body = String(req.body.body || '').trim();
    if (!body) return res.status(400).json({ success: false, message: 'Body required.' });

    const msg = await SupportMessage.findOne({ _id: msgId, conversation: id, senderRole: 'admin' });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });

    msg.body     = body;
    msg.edited   = true;
    msg.editedAt = new Date();
    await msg.save();

    const ioInst = io(req);
    if (ioInst) {
      const conv = await SupportConversation.findById(id).select('user').lean();
      if (conv) {
        const payload = { conversationId: id, message: msg.toObject() };
        ioInst.to(support.userRoom(conv.user)).emit('support:message-edited', payload);
        ioInst.to(support.ADMIN_ROOM).emit('support:message-edited', payload);
      }
    }

    res.json({ success: true, data: msg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: delete a single message ───────────────────────────────────────────
exports.deleteMessage = async (req, res) => {
  try {
    const { id, msgId } = req.params;
    const msg = await SupportMessage.findOne({ _id: msgId, conversation: id });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });

    await msg.deleteOne();

    // If this was the last message, update the conversation preview
    const conv = await SupportConversation.findById(id);
    if (!conv) return res.json({ success: true });

    const lastMsg = await SupportMessage.findOne({ conversation: id }).sort({ createdAt: -1 });
    conv.lastMessageBody = lastMsg ? lastMsg.body.slice(0, 200) : '';
    conv.lastMessageAt   = lastMsg ? lastMsg.createdAt : null;
    conv.lastSenderRole  = lastMsg ? lastMsg.senderRole : null;
    await conv.save();

    const ioInst = io(req);
    if (ioInst) {
      const payload = { conversationId: id, messageId: msgId };
      ioInst.to(support.userRoom(conv.user)).emit('support:message-deleted', payload);
      ioInst.to(support.ADMIN_ROOM).emit('support:message-deleted', payload);
      const summary = support.summarize(conv);
      ioInst.to(support.userRoom(conv.user)).emit('support:conversation', summary);
      ioInst.to(support.ADMIN_ROOM).emit('support:conversation', summary);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: delete all messages in a conversation ──────────────────────────────
exports.deleteConversationMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await SupportConversation.findById(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });

    await SupportMessage.deleteMany({ conversation: id });

    conv.lastMessageBody  = '';
    conv.lastMessageAt    = null;
    conv.lastSenderRole   = null;
    conv.adminUnread      = 0;
    conv.userUnread       = 0;
    await conv.save();

    const ioInst = io(req);
    if (ioInst) {
      ioInst.to(support.userRoom(conv.user)).emit('support:messages-cleared', { conversationId: id });
      ioInst.to(support.ADMIN_ROOM).emit('support:messages-cleared', { conversationId: id });
      const summary = support.summarize(conv);
      ioInst.to(support.userRoom(conv.user)).emit('support:conversation', summary);
      ioInst.to(support.ADMIN_ROOM).emit('support:conversation', summary);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: delete entire conversation ────────────────────────────────────────
exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await SupportConversation.findById(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found.' });

    await SupportMessage.deleteMany({ conversation: id });
    await conv.deleteOne();

    const ioInst = io(req);
    if (ioInst) {
      ioInst.to(support.userRoom(conv.user)).emit('support:conversation-deleted', { conversationId: id });
      ioInst.to(support.ADMIN_ROOM).emit('support:conversation-deleted', { conversationId: id });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

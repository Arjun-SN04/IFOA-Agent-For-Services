/**
 * SupportMessage.js
 *
 * A single message inside a SupportConversation (human ↔ admin live chat).
 * Persisted so chat history survives reconnects / page reloads.
 */
const mongoose = require('mongoose');

const SupportMessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportConversation', required: true, index: true },

  // Who sent it: the airline/individual ('user') or support staff ('admin').
  senderRole: { type: String, enum: ['user', 'admin'], required: true },
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String, default: '' },

  body: { type: String, required: true, trim: true, maxlength: 4000 },
}, { timestamps: true });

// Fast history fetch ordered oldest→newest for a conversation.
SupportMessageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('SupportMessage', SupportMessageSchema);

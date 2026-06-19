/**
 * SupportConversation.js
 *
 * One conversation per airline/individual USER account (human ↔ admin support).
 * This is the human live-chat — completely separate from the Gemini AI bot
 * (controller/chatController.js). The admin sees every conversation grouped by
 * role (Individual / Airline); the user has a single conversation with support.
 */
const mongoose = require('mongoose');

const SupportConversationSchema = new mongoose.Schema({
  // The airline/individual User account this conversation belongs to.
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  role:  { type: String, enum: ['airline', 'individual'], required: true, index: true },

  // Denormalised display fields so the admin list never needs a join.
  name:  { type: String, default: '' },
  email: { type: String, default: '' },

  // Last-message preview for the admin list + ordering.
  lastMessageBody:   { type: String, default: '' },
  lastMessageAt:     { type: Date,   default: null, index: true },
  lastSenderRole:    { type: String, enum: ['user', 'admin', null], default: null },

  // Unread counters — adminUnread = messages the admin hasn't seen,
  // userUnread = messages the user hasn't seen.
  adminUnread: { type: Number, default: 0 },
  userUnread:  { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('SupportConversation', SupportConversationSchema);

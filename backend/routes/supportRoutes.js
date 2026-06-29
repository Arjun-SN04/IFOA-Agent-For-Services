/**
 * supportRoutes.js  — mounted at /api/support
 *
 * Human ↔ admin live-chat REST routes (history + non-socket fallback).
 * Kept entirely separate from the Gemini AI chat (/api/chat).
 */
const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controller/supportController');

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  next();
};

router.use(auth);

// ── User (airline / individual) ──────────────────────────────────────────────
router.get('/me',           ctrl.getMyConversation);
router.post('/me/messages', ctrl.sendMyMessage);
router.post('/me/read',     ctrl.markMyRead);

// ── Admin ─────────────────────────────────────────────────────────────────────
router.get('/conversations',              adminOnly, ctrl.listConversations);
router.get('/conversations/by-user/:userId', adminOnly, ctrl.getConversationByUser);
router.get('/conversations/:id',          adminOnly, ctrl.getConversation);
router.post('/conversations/:id/messages',              adminOnly, ctrl.replyToConversation);
router.patch('/conversations/:id/messages/:msgId',     adminOnly, ctrl.editMessage);
router.delete('/conversations/:id/messages/:msgId',    adminOnly, ctrl.deleteMessage);
router.delete('/conversations/:id/messages',           adminOnly, ctrl.deleteConversationMessages);
router.delete('/conversations/:id',                   adminOnly, ctrl.deleteConversation);
router.post('/conversations/:id/read',                 adminOnly, ctrl.markConversationRead);
router.post('/conversations/:id/email',                adminOnly, ctrl.emailUser);
router.post('/email/bulk',                             adminOnly, ctrl.emailUsers);

module.exports = router;

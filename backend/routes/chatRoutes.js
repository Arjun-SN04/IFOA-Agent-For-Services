const express = require('express');
const router = express.Router();
const { chat } = require('../controller/chatController');

// POST /api/chat
router.post('/', chat);

module.exports = router;

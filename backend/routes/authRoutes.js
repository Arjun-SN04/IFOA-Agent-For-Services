const express = require('express');
const router = express.Router();
const authCtrl = require('../controller/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', authCtrl.signup);
router.post('/login', authCtrl.login);
router.get('/me', authMiddleware, authCtrl.getMe);
router.post('/seed-admin', authCtrl.seedAdmin); // one-time setup

module.exports = router;

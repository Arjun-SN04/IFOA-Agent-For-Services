const express = require('express');
const router = express.Router();
const authCtrl = require('../controller/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', authCtrl.signup);
router.post('/login', authCtrl.login);
router.get('/me', authMiddleware, authCtrl.getMe);
router.post('/seed-admin-signup', authCtrl.seedAdminSignup);
router.post('/seed-admin-login', authCtrl.seedAdminLogin);
router.put('/update-credentials', authMiddleware, authCtrl.updateCredentials);
router.put('/update-profile', authMiddleware, authCtrl.updateProfile);
router.put('/link-registration', authMiddleware, authCtrl.linkRegistration);

module.exports = router;

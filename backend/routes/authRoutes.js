const express = require('express');
const router = express.Router();
const authCtrl = require('../controller/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', authCtrl.signup);
router.post('/send-otp', authCtrl.sendOtp);
router.post('/verify-otp-signup', authCtrl.verifyOtpAndSignup);
router.post('/reset-password', authCtrl.resetPasswordWithOtp);
router.post('/login', authCtrl.login);
router.get('/me', authMiddleware, authCtrl.getMe);
router.get('/admin/accounts-without-plan', authMiddleware, authCtrl.listAccountsWithoutPlan);
router.post('/seed-admin-signup', authCtrl.seedAdminSignup);
router.post('/seed-admin-login', authCtrl.seedAdminLogin);
router.put('/update-credentials', authMiddleware, authCtrl.updateCredentials);
router.put('/update-profile', authMiddleware, authCtrl.updateProfile);
router.put('/link-registration', authMiddleware, authCtrl.linkRegistration);
router.put('/add-subscription', authMiddleware, authCtrl.addSubscription);
router.put('/update-airline-name', authMiddleware, authCtrl.updateAirlineName);
router.post('/add-secondary-email', authMiddleware, authCtrl.addSecondaryEmail);
router.delete('/remove-secondary-email', authMiddleware, authCtrl.removeSecondaryEmail);
router.post('/send-secondary-email-otp', authMiddleware, authCtrl.sendSecondaryEmailOtp);
router.post('/verify-secondary-email', authMiddleware, authCtrl.verifyOtpAndAddSecondary);
router.post('/send-credential-change-otp', authMiddleware, authCtrl.sendCredentialChangeOtp);
router.post('/verify-otp-and-update-credentials', authMiddleware, authCtrl.verifyOtpAndUpdateCredentials);

module.exports = router;

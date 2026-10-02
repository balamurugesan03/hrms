const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } = require('../validators/authValidator');

router.post('/login', validate(loginSchema), ctrl.login);
router.post('/refresh-token', ctrl.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), ctrl.forgotPassword);
router.put('/reset-password/:token', validate(resetPasswordSchema), ctrl.resetPassword);
router.use(protect);
router.get('/me', ctrl.getMe);
router.post('/logout', ctrl.logout);
router.put('/change-password', validate(changePasswordSchema), ctrl.changePassword);

module.exports = router;

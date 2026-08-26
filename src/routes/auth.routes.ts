import { Router } from 'express';
import { body } from 'express-validator';
import { authController } from '../controllers/auth.controller';
import { invitationController } from '../controllers/invitation.controller';
import { authMiddleware } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/** Preview invite for register form (public, rate-limited) */
router.get('/invitation', authLimiter, invitationController.preview);

/** Whether public (open) signup is enabled — UI CTAs; server env is source of truth */
router.get('/registration-options', authLimiter, authController.registrationOptions);

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    // Optional: required only when ALLOW_PUBLIC_SIGNUP is not enabled (enforced in controller)
    body('invitationToken').optional({ values: 'falsy' }).isString(),
  ],
  authController.register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  authController.login
);

router.post('/logout', authMiddleware, authController.logout);

router.post(
  '/refresh',
  authLimiter,
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  authController.refresh
);

router.post(
  '/verify-email',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('code').isLength({ min: 6, max: 6 }).withMessage('Code must be 6 digits'),
  ],
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  authLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  authController.resendVerification
);

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authLimiter,
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  authController.resetPassword
);

router.get('/me', authMiddleware, authController.me);

export default router;

import { Router } from 'express';
import { body } from 'express-validator';
import { invitationController } from '../../controllers/invitation.controller';
import { inviteRouteAuth } from '../../middleware/inviteApiKey';
import { inviteApiKeyLimiter } from '../../middleware/rateLimiter';

const router = Router();

router.use(inviteApiKeyLimiter);
router.use(inviteRouteAuth);

router.get('/', invitationController.list);
router.post(
  '/',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('access').isIn(['MOAJAM', 'KIDS', 'BOTH']).withMessage('access must be MOAJAM, KIDS, or BOTH'),
    body('parentEmail')
      .optional({ values: 'null' })
      .custom((value) => {
        if (value === undefined || value === null || value === '') return true;
        // lightweight email check; normalizeEmail applied when present
        return typeof value === 'string' && value.includes('@');
      })
      .withMessage('Valid parentEmail is required when provided'),
  ],
  invitationController.create
);
router.delete('/:id', invitationController.revoke);

export default router;

import { Router } from 'express';
import { body } from 'express-validator';
import { invitationController } from '../../controllers/invitation.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

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

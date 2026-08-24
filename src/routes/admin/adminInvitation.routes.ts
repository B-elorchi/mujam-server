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
  [body('email').isEmail().normalizeEmail().withMessage('Valid email is required')],
  invitationController.create
);
router.delete('/:id', invitationController.revoke);

export default router;

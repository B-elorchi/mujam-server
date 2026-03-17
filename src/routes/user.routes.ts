import { Router } from 'express';
import { body } from 'express-validator';
import { userController } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth';
import { uploadAvatar } from '../middleware/upload';

const router = Router();

router.get('/profile', authMiddleware, userController.getProfile);

router.patch(
  '/profile',
  authMiddleware,
  [body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')],
  userController.updateProfile
);

router.post('/avatar', authMiddleware, uploadAvatar, userController.uploadAvatar);

router.delete('/account', authMiddleware, userController.deleteAccount);

router.get('/stats', authMiddleware, userController.getStats);

router.get('/activity', authMiddleware, userController.getActivity);

export default router;
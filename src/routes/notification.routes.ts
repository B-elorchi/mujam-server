import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, notificationController.getNotifications);
router.post('/:id/read', authMiddleware, notificationController.markRead);
router.post('/read-all', authMiddleware, notificationController.markAllRead);
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);

export default router;
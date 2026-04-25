import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth';
import { sseAuthMiddleware } from '../middleware/sseAuth';

const router = Router();

router.get('/stream', sseAuthMiddleware, notificationController.stream);
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);
router.get('/', authMiddleware, notificationController.getNotifications);
router.post('/read-all', authMiddleware, notificationController.markAllRead);
router.post('/:id/read', authMiddleware, notificationController.markRead);

export default router;

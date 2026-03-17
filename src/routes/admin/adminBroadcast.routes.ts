import { Router } from 'express';
import { adminBroadcastController } from '../../controllers/adminBroadcast.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/broadcast/preview', adminBroadcastController.preview);
router.post('/broadcast/send', adminBroadcastController.send);
router.post('/broadcast/schedule', adminBroadcastController.schedule);
router.get('/broadcast/history', adminBroadcastController.getHistory);

export default router;
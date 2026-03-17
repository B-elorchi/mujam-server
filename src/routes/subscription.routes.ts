import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, subscriptionController.getSubscription);
router.post('/subscribe', authMiddleware, subscriptionController.subscribe);
router.post('/cancel', authMiddleware, subscriptionController.cancel);

export default router;
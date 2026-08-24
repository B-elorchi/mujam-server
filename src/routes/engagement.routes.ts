import { Router } from 'express';
import { body } from 'express-validator';
import { engagementController } from '../controllers/engagement.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/heartbeat', authMiddleware, engagementController.heartbeat);

router.get('/daily-path', authMiddleware, engagementController.getDailyPath);
router.patch(
  '/daily-path/progress',
  authMiddleware,
  [body('step').isIn(['sentences', 'game', 'shadowing', 'ai'])],
  engagementController.markDailyPathStep
);

router.get('/weekly-challenge', authMiddleware, engagementController.getWeeklyChallenge);
router.post(
  '/weekly-challenge/progress',
  authMiddleware,
  engagementController.updateWeeklyChallenge
);

export default router;

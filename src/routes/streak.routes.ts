import { Router } from 'express';
import { streakController } from '../controllers/streak.controller';
import { authMiddleware } from '../middleware/auth';
import { planGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/', authMiddleware, streakController.getStreak);
router.post('/freeze', authMiddleware, planGuard('PREMIUM'), streakController.useFreeze);
router.get('/achievements', authMiddleware, streakController.getAchievements);

export default router;
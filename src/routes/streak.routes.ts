import { Router } from 'express';
import { streakController } from '../controllers/streak.controller';
import { authMiddleware } from '../middleware/auth';
import { planGuard, moajamAccessGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/', authMiddleware, moajamAccessGuard, streakController.getStreak);
router.post('/freeze', authMiddleware, moajamAccessGuard, planGuard('PREMIUM'), streakController.useFreeze);
router.get('/achievements', authMiddleware, moajamAccessGuard, streakController.getAchievements);

export default router;
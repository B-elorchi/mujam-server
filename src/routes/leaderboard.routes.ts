import { Router } from 'express';
import { leaderboardController } from '../controllers/leaderboard.controller';
import { authMiddleware } from '../middleware/auth';
import { moajamAccessGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/', authMiddleware, moajamAccessGuard, leaderboardController.getLeaderboard);

export default router;
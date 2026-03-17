import { Router } from 'express';
import { leaderboardController } from '../controllers/leaderboard.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, leaderboardController.getLeaderboard);

export default router;
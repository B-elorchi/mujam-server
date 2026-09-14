import { Router } from 'express';
import { gameController } from '../controllers/game.controller';
import { authMiddleware } from '../middleware/auth';
import { moajamAccessGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/level/:levelId', authMiddleware, moajamAccessGuard, gameController.getGamesByLevel);
router.get('/:id', authMiddleware, moajamAccessGuard, gameController.getGame);
router.post('/:id/submit', authMiddleware, moajamAccessGuard, gameController.submitAnswers);
router.get('/:id/progress', authMiddleware, moajamAccessGuard, gameController.getProgress);

export default router;
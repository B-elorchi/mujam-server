import { Router } from 'express';
import { gameController } from '../controllers/game.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/level/:levelId', authMiddleware, gameController.getGamesByLevel);
router.get('/:id', authMiddleware, gameController.getGame);
router.post('/:id/submit', authMiddleware, gameController.submitAnswers);
router.get('/:id/progress', authMiddleware, gameController.getProgress);

export default router;
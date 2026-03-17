import { Router } from 'express';
import { levelController } from '../controllers/level.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, levelController.getLevels);
router.get('/:id', authMiddleware, levelController.getLevel);
router.get('/:id/sentences', authMiddleware, levelController.getSentences);
router.post('/:id/sentences/:sentenceId/listen', authMiddleware, levelController.markListened);
router.post('/:id/sentences/:sentenceId/complete', authMiddleware, levelController.markCompleted);
router.get('/:id/progress', authMiddleware, levelController.getProgress);

export default router;
import { Router } from 'express';
import { placementController } from '../controllers/placement.controller';
import { authMiddleware } from '../middleware/auth';
import { moajamAccessGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/questions', authMiddleware, moajamAccessGuard, placementController.getQuestions);
router.post('/submit', authMiddleware, moajamAccessGuard, placementController.submitTest);
router.get('/result', authMiddleware, moajamAccessGuard, placementController.getResult);

export default router;
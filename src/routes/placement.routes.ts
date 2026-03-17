import { Router } from 'express';
import { placementController } from '../controllers/placement.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/questions', authMiddleware, placementController.getQuestions);
router.post('/submit', authMiddleware, placementController.submitTest);
router.get('/result', authMiddleware, placementController.getResult);

export default router;
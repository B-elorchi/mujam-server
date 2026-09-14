import { Router } from 'express';
import { quizController } from '../controllers/quiz.controller';
import { authMiddleware } from '../middleware/auth';
import { moajamAccessGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/level/:id', authMiddleware, moajamAccessGuard, quizController.getQuiz);
router.post('/level/:id/submit', authMiddleware, moajamAccessGuard, quizController.submitQuiz);
router.get('/level/:id/attempts', authMiddleware, moajamAccessGuard, quizController.getAttempts);

export default router;
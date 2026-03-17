import { Router } from 'express';
import { quizController } from '../controllers/quiz.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/level/:id', authMiddleware, quizController.getQuiz);
router.post('/level/:id/submit', authMiddleware, quizController.submitQuiz);
router.get('/level/:id/attempts', authMiddleware, quizController.getAttempts);

export default router;
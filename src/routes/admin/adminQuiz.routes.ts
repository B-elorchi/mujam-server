import { Router } from 'express';
import { body } from 'express-validator';
import { adminQuizController } from '../../controllers/adminQuiz.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// GET quizzes (with optional levelId filter)
router.get('/quizzes', adminQuizController.getQuizzes);

// GET single quiz with questions
router.get('/quizzes/:id', adminQuizController.getQuiz);

// POST create quiz
router.post(
  '/quizzes',
  [
    body('levelId').isInt({ min: 1, max: 7 }).withMessage('Level ID must be 1-7'),
    body('passScore').optional().isInt({ min: 0, max: 100 }).withMessage('Pass score must be 0-100'),
    body('maxAttempts').optional().isInt({ min: 1 }).withMessage('Max attempts must be >= 1'),
    body('timeLimit').optional().isInt({ min: 1 }).withMessage('Time limit must be >= 1'),
  ],
  adminQuizController.createQuiz
);

// PATCH update quiz
router.patch(
  '/quizzes/:id',
  [
    body('passScore').optional().isInt({ min: 0, max: 100 }).withMessage('Pass score must be 0-100'),
    body('maxAttempts').optional().isInt({ min: 1 }).withMessage('Max attempts must be >= 1'),
    body('timeLimit').optional().isInt({ min: 1 }).withMessage('Time limit must be >= 1'),
  ],
  adminQuizController.updateQuiz
);

// DELETE quiz
router.delete('/quizzes/:id', adminQuizController.deleteQuiz);

// POST add question to quiz
router.post(
  '/quizzes/:id/questions',
  [
    body('type').isIn(['MULTIPLE_CHOICE', 'FILL_BLANK', 'DRAG_DROP', 'AUDIO_MATCH']).withMessage('Invalid question type'),
    body('questionData').isObject().withMessage('questionData must be an object'),
    body('correctAnswer').trim().notEmpty().withMessage('correctAnswer is required'),
    body('points').optional().isInt({ min: 1 }).withMessage('Points must be >= 1'),
    body('orderIndex').isInt({ min: 1 }).withMessage('Order index must be >= 1'),
    body('sentenceId').optional().isString().withMessage('sentenceId must be a string'),
  ],
  adminQuizController.addQuestion
);

// PATCH update question
router.patch(
  '/quizzes/:id/questions/:questionId',
  [
    body('questionData').optional().isObject().withMessage('questionData must be an object'),
    body('correctAnswer').optional().trim().notEmpty().withMessage('correctAnswer cannot be empty'),
    body('points').optional().isInt({ min: 1 }).withMessage('Points must be >= 1'),
    body('orderIndex').optional().isInt({ min: 1 }).withMessage('Order index must be >= 1'),
  ],
  adminQuizController.updateQuestion
);

// DELETE question
router.delete('/quizzes/:id/questions/:questionId', adminQuizController.deleteQuestion);

export default router;

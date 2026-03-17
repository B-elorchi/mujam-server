import { Router } from 'express';
import { body } from 'express-validator';
import { adminGameController } from '../../controllers/adminGame.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// GET games (with optional levelId filter)
router.get('/games', adminGameController.getGames);

// GET single game with questions
router.get('/games/:id', adminGameController.getGame);

// POST create game
router.post(
  '/games',
  [
    body('levelId').isInt({ min: 1, max: 7 }).withMessage('Level ID must be 1-7'),
    body('type').isIn(['DRAG_DROP', 'MULTIPLE_CHOICE', 'AUDIO_MATCH', 'FILL_BLANK']).withMessage('Invalid game type'),
    body('titleAr').trim().isLength({ min: 2, max: 200 }).withMessage('Arabic title required (2-200 chars)'),
    body('titleEn').optional().trim().isLength({ min: 2, max: 200 }).withMessage('English title 2-200 chars'),
    body('orderIndex').isInt({ min: 1 }).withMessage('Order index must be >= 1'),
  ],
  adminGameController.createGame
);

// PATCH update game
router.patch(
  '/games/:id',
  [
    body('titleAr').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Arabic title 2-200 chars'),
    body('titleEn').optional().trim().isLength({ min: 2, max: 200 }).withMessage('English title 2-200 chars'),
    body('orderIndex').optional().isInt({ min: 1 }).withMessage('Order index must be >= 1'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  ],
  adminGameController.updateGame
);

// DELETE game
router.delete('/games/:id', adminGameController.deleteGame);

// POST add question to game
router.post(
  '/games/:id/questions',
  [
    body('questionData').isObject().withMessage('questionData must be an object'),
    body('correctAnswer').trim().notEmpty().withMessage('correctAnswer is required'),
    body('orderIndex').isInt({ min: 1 }).withMessage('Order index must be >= 1'),
    body('sentenceId').optional().isString().withMessage('sentenceId must be a string'),
  ],
  adminGameController.addQuestion
);

// PATCH update question
router.patch(
  '/games/:id/questions/:questionId',
  [
    body('questionData').optional().isObject().withMessage('questionData must be an object'),
    body('correctAnswer').optional().trim().notEmpty().withMessage('correctAnswer cannot be empty'),
    body('orderIndex').optional().isInt({ min: 1 }).withMessage('Order index must be >= 1'),
  ],
  adminGameController.updateQuestion
);

// DELETE question
router.delete('/games/:id/questions/:questionId', adminGameController.deleteQuestion);

export default router;

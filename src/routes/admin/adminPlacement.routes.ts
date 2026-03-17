import { Router } from 'express';
import { body } from 'express-validator';
import { adminPlacementController } from '../../controllers/adminPlacement.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// GET all placement questions (with optional targetLevel filter)
router.get('/questions', adminPlacementController.getQuestions);

// GET single placement question by ID
router.get('/questions/:id', adminPlacementController.getQuestion);

// POST create new placement question
router.post(
  '/questions',
  [
    body('sentenceEn').trim().isLength({ min: 5, max: 200 }).withMessage('Sentence must be 5-200 characters'),
    body('correctAr').trim().isLength({ min: 2, max: 200 }).withMessage('Correct answer must be 2-200 characters'),
    body('options').isArray({ min: 4, max: 4 }).withMessage('Must provide exactly 4 options'),
    body('targetLevel').isInt({ min: 1, max: 7 }).withMessage('Target level must be 1-7'),
    body('orderIndex').isInt({ min: 1 }).withMessage('Order index must be >= 1'),
  ],
  adminPlacementController.createQuestion
);

// PATCH update placement question
router.patch(
  '/questions/:id',
  [
    body('sentenceEn').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Sentence must be 5-200 characters'),
    body('correctAr').optional().trim().isLength({ min: 2, max: 200 }).withMessage('Correct answer must be 2-200 characters'),
    body('options').optional().isArray({ min: 4, max: 4 }).withMessage('Must provide exactly 4 options'),
    body('targetLevel').optional().isInt({ min: 1, max: 7 }).withMessage('Target level must be 1-7'),
    body('orderIndex').optional().isInt({ min: 1 }).withMessage('Order index must be >= 1'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  ],
  adminPlacementController.updateQuestion
);

// DELETE (soft delete) placement question
router.delete('/questions/:id', adminPlacementController.deleteQuestion);

// POST reorder placement questions
router.post(
  '/questions/reorder',
  [
    body('questions').isArray().withMessage('questions must be an array'),
  ],
  adminPlacementController.reorderQuestions
);

export default router;

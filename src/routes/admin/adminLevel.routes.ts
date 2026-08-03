import { Router } from 'express';
import { body } from 'express-validator';
import { adminLevelController } from '../../controllers/adminLevel.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// GET all levels
router.get('/levels', adminLevelController.getLevels);

// GET single level
router.get('/levels/:id', adminLevelController.getLevel);

// POST create new level
router.post(
  '/levels',
  [
    body('id').isInt({ min: 1, max: 7 }).withMessage('ID must be 1-7'),
    body('titleAr').trim().isLength({ min: 2, max: 100 }).withMessage('Arabic title required (2-100 chars)'),
    body('titleEn').trim().isLength({ min: 2, max: 100 }).withMessage('English title required (2-100 chars)'),
    body('icon').optional().trim().isLength({ max: 10 }).withMessage('Icon max 10 chars'),
    body('orderIndex').isInt({ min: 1 }).withMessage('Order index must be >= 1'),
    body('isFree').isBoolean().withMessage('isFree must be boolean'),
  ],
  adminLevelController.createLevel
);

// PATCH update level
router.patch(
  '/levels/:id',
  [
    body('titleAr').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Arabic title 2-100 chars'),
    body('titleEn').optional().trim().isLength({ min: 2, max: 100 }).withMessage('English title 2-100 chars'),
    body('icon').optional().trim().isLength({ max: 10 }).withMessage('Icon max 10 chars'),
    body('orderIndex').optional().isInt({ min: 1 }).withMessage('Order index must be >= 1'),
    body('isFree').optional().isBoolean().withMessage('isFree must be boolean'),
  ],
  adminLevelController.updateLevel
);

// DELETE level
router.delete('/levels/:id', adminLevelController.deleteLevel);

export default router;

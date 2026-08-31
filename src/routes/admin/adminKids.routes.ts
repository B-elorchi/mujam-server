import { Router } from 'express';
import { body } from 'express-validator';
import { adminKidsController } from '../../controllers/adminKids.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

const colorOptional = body('color')
  .optional()
  .isIn(['blue', 'sky', 'yellow', 'pink', 'green', 'purple', 'orange']);

router.get('/modules', adminKidsController.listModules);
router.get('/modules/:id', adminKidsController.getModule);

router.post(
  '/modules',
  [
    body('id').trim().isLength({ min: 2, max: 64 }).matches(/^[a-z0-9-]+$/),
    body('titleEn').trim().isLength({ min: 2, max: 120 }),
    body('titleAr').trim().isLength({ min: 2, max: 120 }),
    body('icon').optional().trim().isLength({ max: 16 }),
    colorOptional,
    body('orderIndex').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
  ],
  adminKidsController.createModule
);

router.patch(
  '/modules/:id',
  [
    body('titleEn').optional().trim().isLength({ min: 2, max: 120 }),
    body('titleAr').optional().trim().isLength({ min: 2, max: 120 }),
    body('icon').optional().trim().isLength({ max: 16 }),
    colorOptional,
    body('orderIndex').optional().isInt({ min: 0 }),
    body('isActive').optional().isBoolean(),
    body('progress').optional().isInt({ min: 0, max: 100 }),
    body('stars').optional().isInt({ min: 0, max: 3 }),
  ],
  adminKidsController.updateModule
);

router.delete('/modules/:id', adminKidsController.removeModule);

router.post(
  '/modules/:id/screens',
  [
    body('type').trim().isLength({ min: 2, max: 32 }),
    body('orderIndex').optional().isInt({ min: 0 }),
    body('payload').optional().isObject(),
  ],
  adminKidsController.createScreen
);

router.post(
  '/modules/:id/screens/reorder',
  [
    body('items').isArray({ min: 1 }),
    body('items.*.id').isString().notEmpty(),
    body('items.*.orderIndex').isInt({ min: 0 }),
  ],
  adminKidsController.reorderScreens
);

router.patch(
  '/screens/:id',
  [
    body('type').optional().trim().isLength({ min: 2, max: 32 }),
    body('orderIndex').optional().isInt({ min: 0 }),
    body('payload').optional().isObject(),
  ],
  adminKidsController.updateScreen
);

router.delete('/screens/:id', adminKidsController.removeScreen);

export default router;

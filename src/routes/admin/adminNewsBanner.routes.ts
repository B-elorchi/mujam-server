import { Router } from 'express';
import { body } from 'express-validator';
import { adminNewsBannerController } from '../../controllers/adminNewsBanner.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

const colorOptional = body('bgColor')
  .optional({ nullable: true })
  .custom((v) => v === null || v === '' || /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(v)));
const textColorOptional = body('textColor')
  .optional({ nullable: true })
  .custom((v) => v === null || v === '' || /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(v)));

router.get('/', adminNewsBannerController.list);

router.post(
  '/',
  [
    body('messageAr').trim().isLength({ min: 2, max: 500 }).withMessage('messageAr required (2–500)'),
    body('linkUrl').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('isActive').optional().isBoolean(),
    body('orderIndex').optional().isInt({ min: 0 }),
    colorOptional,
    textColorOptional,
  ],
  adminNewsBannerController.create
);

router.patch(
  '/:id',
  [
    body('messageAr').optional().trim().isLength({ min: 2, max: 500 }),
    body('linkUrl').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('isActive').optional().isBoolean(),
    body('orderIndex').optional().isInt({ min: 0 }),
    colorOptional,
    textColorOptional,
  ],
  adminNewsBannerController.update
);

router.post(
  '/reorder',
  [
    body('items').isArray({ min: 1 }),
    body('items.*.id').isString().notEmpty(),
    body('items.*.orderIndex').isInt({ min: 0 }),
  ],
  adminNewsBannerController.reorder
);

router.delete('/:id', adminNewsBannerController.remove);

export default router;

import { Router } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';
import { adminGrammarRuleController } from '../../controllers/adminGrammarRule.controller';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/grammar-rules', adminGrammarRuleController.list);
router.get('/grammar-rules/:id', adminGrammarRuleController.getOne);

router.post(
  '/grammar-rules',
  [
    body('levelId').isInt({ min: 1 }).withMessage('levelId required'),
    body('titleAr').trim().isLength({ min: 2, max: 200 }).withMessage('titleAr'),
    body('titleEn').trim().isLength({ min: 2, max: 200 }).withMessage('titleEn'),
    body('explanation').trim().isLength({ min: 4, max: 20000 }).withMessage('explanation'),
    body('examples').isArray().withMessage('examples must be array'),
    body('exercises').optional().isArray().withMessage('exercises must be array'),
    body('orderIndex').isInt({ min: 1 }).withMessage('orderIndex'),
  ],
  adminGrammarRuleController.create
);

router.patch(
  '/grammar-rules/:id',
  [
    body('titleAr').optional().trim().isLength({ min: 2, max: 200 }),
    body('titleEn').optional().trim().isLength({ min: 2, max: 200 }),
    body('explanation').optional().trim().isLength({ min: 4, max: 20000 }),
    body('examples').optional(),
    body('exercises').optional().isArray(),
    body('orderIndex').optional().isInt({ min: 1 }),
    body('isActive').optional().isBoolean(),
  ],
  adminGrammarRuleController.patch
);

router.delete('/grammar-rules/:id', adminGrammarRuleController.softDelete);

export default router;

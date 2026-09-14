import { Router } from 'express';
import { levelController } from '../controllers/level.controller';
import { authMiddleware } from '../middleware/auth';
import { moajamAccessGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/', authMiddleware, moajamAccessGuard, levelController.getLevels);
router.get('/:id/grammar-rules/:ruleId', authMiddleware, moajamAccessGuard, levelController.getGrammarRuleById);
router.get('/:id/grammar-rules', authMiddleware, moajamAccessGuard, levelController.getGrammarRules);
router.post('/:id/complete-grammar', authMiddleware, moajamAccessGuard, levelController.completeGrammarLevel);
router.get('/:id/sentences', authMiddleware, moajamAccessGuard, levelController.getSentences);
router.post('/:id/sentences/:sentenceId/listen', authMiddleware, moajamAccessGuard, levelController.markListened);
router.post('/:id/sentences/:sentenceId/complete', authMiddleware, moajamAccessGuard, levelController.markCompleted);
router.get('/:id/progress', authMiddleware, moajamAccessGuard, levelController.getProgress);
router.get('/:id', authMiddleware, moajamAccessGuard, levelController.getLevel);

export default router;
import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/adminAuth';
import { moajamAccessGuard } from '../middleware/roleGuard';
import { uploadAudio } from '../middleware/upload';
import { aiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/scenarios', authMiddleware, moajamAccessGuard, aiController.getScenarios);
router.post('/session/start', authMiddleware, moajamAccessGuard, aiLimiter, aiController.startSession);
router.post('/session/:id/message', authMiddleware, moajamAccessGuard, aiLimiter, uploadAudio.single('audio'), aiController.sendMessage);
router.post('/session/:id/end', authMiddleware, moajamAccessGuard, aiController.endSession);
router.get('/sessions', authMiddleware, moajamAccessGuard, aiController.getSessions);
router.get('/sessions/:id', authMiddleware, moajamAccessGuard, aiController.getSession);
router.get('/difficulty', authMiddleware, moajamAccessGuard, aiController.getDifficultyRecommendation);

// Admin Routes
router.get('/admin/scenarios', authMiddleware, adminMiddleware, aiController.getAdminScenarios);
router.post('/admin/scenarios', authMiddleware, adminMiddleware, aiController.createScenario);
router.patch('/admin/scenarios/:id', authMiddleware, adminMiddleware, aiController.updateScenario);
router.delete('/admin/scenarios/:id', authMiddleware, adminMiddleware, aiController.deleteScenario);
router.get('/admin/settings', authMiddleware, adminMiddleware, aiController.getAdminSettings);
router.patch('/admin/settings', authMiddleware, adminMiddleware, aiController.updateAdminSettings);
router.get('/admin/usage', authMiddleware, adminMiddleware, aiController.getAdminUsage);

export default router;
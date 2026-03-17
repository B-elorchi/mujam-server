import { Router } from 'express';
import { aiController } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/adminAuth';
import { uploadAudio } from '../middleware/upload';

const router = Router();

router.get('/scenarios', authMiddleware, aiController.getScenarios);
router.post('/session/start', authMiddleware, aiController.startSession);
router.post('/session/:id/message', authMiddleware, uploadAudio.single('audio'), aiController.sendMessage);
router.post('/session/:id/end', authMiddleware, aiController.endSession);
router.get('/sessions', authMiddleware, aiController.getSessions);
router.get('/sessions/:id', authMiddleware, aiController.getSession);
router.get('/difficulty', authMiddleware, aiController.getDifficultyRecommendation);

// Admin Routes
router.get('/admin/scenarios', authMiddleware, adminMiddleware, aiController.getAdminScenarios);
router.post('/admin/scenarios', authMiddleware, adminMiddleware, aiController.createScenario);
router.patch('/admin/scenarios/:id', authMiddleware, adminMiddleware, aiController.updateScenario);
router.delete('/admin/scenarios/:id', authMiddleware, adminMiddleware, aiController.deleteScenario);
router.get('/admin/settings', authMiddleware, adminMiddleware, aiController.getAdminSettings);
router.patch('/admin/settings', authMiddleware, adminMiddleware, aiController.updateAdminSettings);
router.get('/admin/usage', authMiddleware, adminMiddleware, aiController.getAdminUsage);

export default router;
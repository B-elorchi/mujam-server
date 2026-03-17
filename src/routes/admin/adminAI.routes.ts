import { Router } from 'express';
import { adminAIController } from '../../controllers/adminAI.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/ai/settings', adminAIController.getAISettings);
router.patch('/ai/settings', adminAIController.updateAISettings);
router.post('/ai/settings/test', adminAIController.testAISettings);

router.get('/ai/scenarios', adminAIController.getScenarios);
router.post('/ai/scenarios', adminAIController.createScenario);
router.patch('/ai/scenarios/:id', adminAIController.updateScenario);
router.delete('/ai/scenarios/:id', adminAIController.deleteScenario);

router.get('/ai/usage', adminAIController.getAIUsage);
router.get('/ai/usage/monthly-total', adminAIController.getMonthlyTotal);

export default router;
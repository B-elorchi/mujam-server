import { Router } from 'express';
import { adminAnalyticsController } from '../../controllers/adminAnalytics.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/analytics/overview', adminAnalyticsController.getOverview);
router.get('/analytics/growth', adminAnalyticsController.getGrowth);
router.get('/analytics/revenue', adminAnalyticsController.getRevenue);
router.get('/analytics/funnel', adminAnalyticsController.getFunnel);
router.get('/analytics/activity-heatmap', adminAnalyticsController.getActivityHeatmap);
router.get('/analytics/content', adminAnalyticsController.getContent);
router.get('/analytics/ai-cost', adminAnalyticsController.getAICost);

export default router;
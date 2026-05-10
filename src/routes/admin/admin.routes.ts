import { Router } from 'express';
import adminUserRoutes from './adminUser.routes';
import adminContentRoutes from './adminContent.routes';
import adminAIRoutes from './adminAI.routes';
import adminBroadcastRoutes from './adminBroadcast.routes';
import adminAnalyticsRoutes from './adminAnalytics.routes';
import adminSettingsRoutes from './adminSettings.routes';
import adminPlacementRoutes from './adminPlacement.routes';
import adminLevelRoutes from './adminLevel.routes';
import adminSentenceRoutes from './adminSentence.routes';
import adminGameRoutes from './adminGame.routes';
import adminQuizRoutes from './adminQuiz.routes';
import adminStoryRoutes from './adminStory.routes';
import adminGrammarRuleRoutes from './adminGrammarRule.routes';
import adminCommunityRoutes from './adminCommunity.routes';

const router = Router();

router.use('/users', adminUserRoutes);
router.use('/content', adminContentRoutes);
router.use('/ai', adminAIRoutes);
router.use('/broadcast', adminBroadcastRoutes);
router.use('/analytics', adminAnalyticsRoutes);
router.use('/settings', adminSettingsRoutes);
router.use('/placement', adminPlacementRoutes);
router.use('/', adminLevelRoutes); // Mounts /admin/levels
router.use('/', adminSentenceRoutes); // Mounts /admin/sentences and /admin/levels/:id/sentences
router.use('/', adminGameRoutes); // Mounts /admin/games
router.use('/', adminQuizRoutes); // Mounts /admin/quizzes
router.use('/', adminStoryRoutes); // Mounts /admin/stories
router.use('/', adminGrammarRuleRoutes);
router.use('/community', adminCommunityRoutes);

export default router;
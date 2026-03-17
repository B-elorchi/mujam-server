import { Router } from 'express';
import { adminSettingsController } from '../../controllers/adminSettings.controller';
import { authMiddleware } from '../../middleware/auth';
import { superAdminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(superAdminMiddleware);

router.get('/settings', adminSettingsController.getSettings);
router.patch('/settings', adminSettingsController.updateSettings);
router.post('/settings/maintenance', adminSettingsController.toggleMaintenance);
router.patch('/settings/feature-flags', adminSettingsController.updateFeatureFlags);

export default router;
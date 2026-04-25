import { Router } from 'express';
import { shadowingController } from '../controllers/shadowing.controller';
import { authMiddleware } from '../middleware/auth';
import { planGuard } from '../middleware/roleGuard';
import { uploadAudio } from '../middleware/upload';

const router = Router();

router.get('/stories', authMiddleware, planGuard('PREMIUM'), shadowingController.getStories);
router.get('/stories/:id', authMiddleware, planGuard('PREMIUM'), shadowingController.getStory);
router.post('/transcribe', authMiddleware, planGuard('PREMIUM'), uploadAudio.single('audio'), shadowingController.transcribe);
router.post('/compare', authMiddleware, planGuard('PREMIUM'), shadowingController.compare);
router.post('/stories/:id/progress', authMiddleware, planGuard('PREMIUM'), shadowingController.saveProgress);
router.post('/stories/:id/complete', authMiddleware, planGuard('PREMIUM'), shadowingController.markComplete);

export default router;
import { Router } from 'express';
import { shadowingController } from '../controllers/shadowing.controller';
import { authMiddleware } from '../middleware/auth';
import { planGuard } from '../middleware/roleGuard';
import { uploadAudio } from '../middleware/upload';

const router = Router();

router.get('/stories', authMiddleware, shadowingController.getStories);
router.get('/stories/:id', authMiddleware, shadowingController.getStory);
router.post('/transcribe', authMiddleware, uploadAudio.single('audio'), shadowingController.transcribe);
router.post('/compare', authMiddleware, shadowingController.compare);
router.post('/stories/:id/progress', authMiddleware, shadowingController.saveProgress);
router.post('/stories/:id/complete', authMiddleware, shadowingController.markComplete);

export default router;
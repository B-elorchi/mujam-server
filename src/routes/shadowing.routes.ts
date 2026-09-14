import { Router } from 'express';
import { shadowingController } from '../controllers/shadowing.controller';
import { authMiddleware } from '../middleware/auth';
import { moajamAccessGuard } from '../middleware/roleGuard';
import { uploadAudio } from '../middleware/upload';

const router = Router();

router.get('/stories', authMiddleware, moajamAccessGuard, shadowingController.getStories);
router.get('/stories/:id', authMiddleware, moajamAccessGuard, shadowingController.getStory);
router.post('/transcribe', authMiddleware, moajamAccessGuard, uploadAudio.single('audio'), shadowingController.transcribe);
router.post('/compare', authMiddleware, moajamAccessGuard, shadowingController.compare);
router.post('/stories/:id/progress', authMiddleware, moajamAccessGuard, shadowingController.saveProgress);
router.post('/stories/:id/complete', authMiddleware, moajamAccessGuard, shadowingController.markComplete);

export default router;

import { Router } from 'express';
import { kidsController } from '../controllers/kids.controller';
import { authMiddleware, optionalAuth, cookieOrBearerAuth } from '../middleware/auth';
import { kidsAudioLimiter } from '../middleware/rateLimiter';

const router = Router();

/** TTS generation requires a logged-in user (catalog stays public). */
router.get('/audio/url', cookieOrBearerAuth, kidsAudioLimiter, kidsController.resolveWordAudioUrl);
router.get('/audio', cookieOrBearerAuth, kidsAudioLimiter, kidsController.getWordAudio);
router.get('/modules', optionalAuth, kidsController.listModules);
router.get('/modules/:id', optionalAuth, kidsController.getModule);
router.get('/modules/:id/lesson', optionalAuth, kidsController.getLesson);

router.get('/stories', optionalAuth, kidsController.listStories);
router.get('/stories/:id', optionalAuth, kidsController.getStory);

/** Mark a lesson complete (auth + accessKids) */
router.post('/modules/:id/complete', authMiddleware, kidsController.completeLesson);

/** Parent progress (auth — email must match child's parentEmail or own kids account) */
router.get('/parent/report', authMiddleware, kidsController.parentReport);

export default router;

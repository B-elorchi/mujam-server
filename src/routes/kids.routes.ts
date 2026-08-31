import { Router } from 'express';
import { kidsController } from '../controllers/kids.controller';
import { authMiddleware, optionalAuth } from '../middleware/auth';

const router = Router();

/** Public kids course catalog (optional auth overlays per-child progress) */
router.get('/audio', optionalAuth, kidsController.getWordAudio);
router.get('/modules', optionalAuth, kidsController.listModules);
router.get('/modules/:id', optionalAuth, kidsController.getModule);
router.get('/modules/:id/lesson', optionalAuth, kidsController.getLesson);

/** Mark a lesson complete (auth + accessKids) */
router.post('/modules/:id/complete', authMiddleware, kidsController.completeLesson);

/** Parent progress (auth — email must match child's parentEmail or own kids account) */
router.get('/parent/report', authMiddleware, kidsController.parentReport);

export default router;

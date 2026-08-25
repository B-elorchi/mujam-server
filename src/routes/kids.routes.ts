import { Router } from 'express';
import { kidsController } from '../controllers/kids.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/** Public kids course catalog */
router.get('/modules', kidsController.listModules);
router.get('/modules/:id', kidsController.getModule);
router.get('/modules/:id/lesson', kidsController.getLesson);

/** Parent progress (auth — email must match child's parentEmail or own kids account) */
router.get('/parent/report', authMiddleware, kidsController.parentReport);

export default router;

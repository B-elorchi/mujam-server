import { Router } from 'express';
import { kidsController } from '../controllers/kids.controller';

const router = Router();

/** Public kids course catalog (no auth — kids space is open) */
router.get('/modules', kidsController.listModules);
router.get('/modules/:id', kidsController.getModule);
router.get('/modules/:id/lesson', kidsController.getLesson);

export default router;

import { Router } from 'express';
import { newsBannerController } from '../controllers/newsBanner.controller';

const router = Router();

/** Public active banners for learner NewsBar */
router.get('/', newsBannerController.listActive);

export default router;

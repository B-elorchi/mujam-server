import { Router } from 'express';
import { referralController } from '../controllers/referral.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/my-code', authMiddleware, referralController.getMyCode);
router.get('/stats', authMiddleware, referralController.getStats);

export default router;
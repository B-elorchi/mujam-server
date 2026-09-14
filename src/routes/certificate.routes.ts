import { Router } from 'express';
import { certificateController } from '../controllers/certificate.controller';
import { authMiddleware } from '../middleware/auth';
import { planGuard, moajamAccessGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/eligibility', authMiddleware, moajamAccessGuard, certificateController.checkEligibility);
router.post('/generate', authMiddleware, moajamAccessGuard, planGuard('PREMIUM'), certificateController.generate);
router.get('/', authMiddleware, moajamAccessGuard, certificateController.getCertificate);
router.get('/verify/:code', certificateController.verify);

export default router;
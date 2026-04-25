import { Router } from 'express';
import { certificateController } from '../controllers/certificate.controller';
import { authMiddleware } from '../middleware/auth';
import { planGuard } from '../middleware/roleGuard';

const router = Router();

router.get('/eligibility', authMiddleware, certificateController.checkEligibility);
router.post('/generate', authMiddleware, planGuard('PREMIUM'), certificateController.generate);
router.get('/', authMiddleware, certificateController.getCertificate);
router.get('/verify/:code', certificateController.verify);

export default router;
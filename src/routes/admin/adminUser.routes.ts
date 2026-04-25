import { Router } from 'express';
import { adminUserController } from '../../controllers/adminUser.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', adminUserController.getUsers);
router.get('/users/:id', adminUserController.getUser);
router.patch('/users/:id', adminUserController.updateUser);
router.post('/users/:id/suspend', adminUserController.suspendUser);
router.post('/users/:id/unsuspend', adminUserController.unsuspendUser);
router.get('/subscriptions', adminUserController.getSubscriptions);
router.get('/certificates', adminUserController.getCertificates);
router.get('/team', adminUserController.getTeam);
router.post('/team/invite', adminUserController.inviteTeamMember);
router.patch('/team/:id/role', adminUserController.updateTeamRole);

export default router;
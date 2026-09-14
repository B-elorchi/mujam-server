import { Router } from 'express';
import { adminUserController } from '../../controllers/adminUser.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware, superAdminMiddleware } from '../../middleware/adminAuth';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/users', adminUserController.getUsers);
router.post('/users', superAdminMiddleware, adminUserController.createUser);
router.get('/users/:id', adminUserController.getUser);
router.patch('/users/:id', superAdminMiddleware, adminUserController.updateUser);
router.delete('/users/:id', superAdminMiddleware, adminUserController.deleteUser);
router.post('/users/:id/suspend', superAdminMiddleware, adminUserController.suspendUser);
router.post('/users/:id/unsuspend', superAdminMiddleware, adminUserController.unsuspendUser);
router.get('/subscriptions', adminUserController.getSubscriptions);
router.get('/certificates', adminUserController.getCertificates);
router.get('/team', adminUserController.getTeam);
router.post('/team/invite', superAdminMiddleware, adminUserController.inviteTeamMember);
router.patch('/team/:id/role', superAdminMiddleware, adminUserController.updateTeamRole);

export default router;

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';
import { adminCommunityController as ctrl } from '../../controllers/adminCommunity.controller';

const router = Router();

router.use(authMiddleware, adminMiddleware);

router.get('/rooms', ctrl.getRooms);
router.post('/rooms', ctrl.createRoom);
router.patch('/rooms/:id', ctrl.updateRoom);

router.get('/members', ctrl.getMembers);
router.patch('/members/:id', ctrl.updateMember);

router.delete('/messages/:id', ctrl.deleteMessage);

router.get('/settings', ctrl.getSettings);
router.patch('/settings', ctrl.updateSettings);

export default router;

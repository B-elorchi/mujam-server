import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { moajamAccessGuard } from '../middleware/roleGuard';
import { uploadAudio } from '../middleware/upload';
import { communityController } from '../controllers/community.controller';

const router = Router();

router.get('/status', authMiddleware, moajamAccessGuard, communityController.getStatus);
router.post('/join', authMiddleware, moajamAccessGuard, communityController.join);
router.get('/rooms', authMiddleware, moajamAccessGuard, communityController.getRooms);
router.get('/rooms/:id/messages', authMiddleware, moajamAccessGuard, communityController.getMessages);
router.post('/rooms/:id/audio', authMiddleware, moajamAccessGuard, uploadAudio.single('audio'), communityController.uploadAudio);
router.post('/rooms/:id/read', authMiddleware, moajamAccessGuard, communityController.markRead);

// Practice 1-on-1
router.get('/members', authMiddleware, moajamAccessGuard, communityController.getMembers);
router.post('/practice/invite', authMiddleware, moajamAccessGuard, communityController.sendInvitation);
router.get('/practice/invitations', authMiddleware, moajamAccessGuard, communityController.getInvitations);
router.post('/practice/invitations/:id/respond', authMiddleware, moajamAccessGuard, communityController.respondInvitation);

export default router;

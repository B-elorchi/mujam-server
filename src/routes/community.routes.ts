import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { uploadAudio } from '../middleware/upload';
import { communityController } from '../controllers/community.controller';

const router = Router();

router.get('/status', authMiddleware, communityController.getStatus);
router.post('/join', authMiddleware, communityController.join);
router.get('/rooms', authMiddleware, communityController.getRooms);
router.get('/rooms/:id/messages', authMiddleware, communityController.getMessages);
router.post('/rooms/:id/audio', authMiddleware, uploadAudio.single('audio'), communityController.uploadAudio);
router.post('/rooms/:id/read', authMiddleware, communityController.markRead);

// Practice 1-on-1
router.get('/members', authMiddleware, communityController.getMembers);
router.post('/practice/invite', authMiddleware, communityController.sendInvitation);
router.get('/practice/invitations', authMiddleware, communityController.getInvitations);
router.post('/practice/invitations/:id/respond', authMiddleware, communityController.respondInvitation);

export default router;

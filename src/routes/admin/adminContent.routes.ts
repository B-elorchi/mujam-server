import { Router } from 'express';
import { adminContentController } from '../../controllers/adminContent.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';
import { uploadAudio, uploadImage } from '../../middleware/upload';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.post('/sentences', adminContentController.createSentence);
router.patch('/sentences/:id', adminContentController.updateSentence);
router.delete('/sentences/:id', adminContentController.deleteSentence);
router.post('/sentences/:id/audio', uploadAudio.single('audio'), adminContentController.uploadSentenceAudio);

router.post('/games', adminContentController.createGame);
router.patch('/games/:id', adminContentController.updateGame);
router.post('/games/:id/questions', adminContentController.addGameQuestion);
router.delete('/games/:id/questions/:qId', adminContentController.deleteGameQuestion);

router.patch('/quizzes/:id', adminContentController.updateQuiz);

router.post('/stories', uploadAudio.single('audio'), adminContentController.createStory);
router.patch('/stories/:id', adminContentController.updateStory);

router.get('/blog', adminContentController.listBlogPosts);
router.post('/blog', adminContentController.createBlogPost);
router.patch('/blog/:id', adminContentController.updateBlogPost);
router.post('/blog/:id/publish', adminContentController.publishBlogPost);
router.delete('/blog/:id', adminContentController.deleteBlogPost);

export default router;
import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { adminStoryController } from '../../controllers/admin/adminStory.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for audio stories
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  },
});

router.use(authMiddleware);
router.use(adminMiddleware);

// GET stories for a level
router.get('/stories', adminStoryController.getStories);

// GET single story
router.get('/stories/:id', adminStoryController.getStory);

// POST create story
router.post(
  '/stories',
  upload.single('audioFile'),
  [
    body('levelId').isInt({ min: 1, max: 7 }),
    body('titleAr').trim().isLength({ min: 2, max: 200 }),
    body('titleEn').optional().trim().isLength({ min: 2, max: 200 }),
    body('fullText').trim().isLength({ min: 10, max: 5000 }),
    body('orderIndex').isInt({ min: 1 }),
    body('wordsTiming').optional().isJSON(),
  ],
  adminStoryController.createStory
);

// PATCH update story
router.patch(
  '/stories/:id',
  upload.single('audioFile'),
  [
    body('titleAr').optional().trim().isLength({ min: 2, max: 200 }),
    body('titleEn').optional().trim().isLength({ min: 2, max: 200 }),
    body('fullText').optional().trim().isLength({ min: 10, max: 5000 }),
    body('orderIndex').optional().isInt({ min: 1 }),
  ],
  adminStoryController.updateStory
);

// DELETE story
router.delete('/stories/:id', adminStoryController.deleteStory);

// POST regenerate timing
router.post('/stories/:id/regenerate-timing', adminStoryController.regenerateTiming);

// POST bulk generate audio for all stories
router.post('/stories/bulk-generate-audio', adminStoryController.bulkGenerateAudio);

export default router;

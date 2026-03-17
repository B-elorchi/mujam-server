import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { adminSentenceController } from '../../controllers/adminSentence.controller';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/adminAuth';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.mimetype === 'audio/mp3') {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 audio files are allowed'));
    }
  },
});

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// GET sentences for a level
router.get('/levels/:levelId/sentences', adminSentenceController.getSentences);

// POST create sentence with optional audio uploads
router.post(
  '/levels/:levelId/sentences',
  upload.fields([
    { name: 'audioNormal', maxCount: 1 },
    { name: 'audioSlow', maxCount: 1 },
  ]),
  [
    body('textEn').trim().isLength({ min: 2, max: 500 }).withMessage('English text required (2-500 chars)'),
    body('textAr').trim().isLength({ min: 2, max: 500 }).withMessage('Arabic text required (2-500 chars)'),
    body('orderIndex').isInt({ min: 1 }).withMessage('Order index must be >= 1'),
  ],
  adminSentenceController.createSentence
);

// PATCH update sentence
router.patch(
  '/sentences/:id',
  upload.fields([
    { name: 'audioNormal', maxCount: 1 },
    { name: 'audioSlow', maxCount: 1 },
  ]),
  [
    body('textEn').optional().trim().isLength({ min: 2, max: 500 }).withMessage('English text 2-500 chars'),
    body('textAr').optional().trim().isLength({ min: 2, max: 500 }).withMessage('Arabic text 2-500 chars'),
    body('orderIndex').optional().isInt({ min: 1 }).withMessage('Order index must be >= 1'),
  ],
  adminSentenceController.updateSentence
);

// DELETE sentence
router.delete('/sentences/:id', adminSentenceController.deleteSentence);

// POST generate audio for a single sentence using TTS
router.post('/sentences/:id/generate-audio', adminSentenceController.generateAudio);

// POST bulk generate audio for all sentences in a level
router.post('/levels/:levelId/sentences/bulk-generate-audio', adminSentenceController.bulkGenerateAudio);

export default router;

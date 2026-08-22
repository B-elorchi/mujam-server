import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const audioMime = (file.mimetype || '').toLowerCase().split(';')[0].trim();
  
  if (file.fieldname === 'audio') {
    if (allowedAudioTypes.includes(audioMime) || audioMime.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type. Allowed: mp3, wav, ogg, webm, m4a'));
    }
  } else if (file.fieldname === 'image') {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file type. Allowed: jpeg, png, gif, webp'));
    }
  } else {
    cb(null, true);
  }
};

export const uploadAudio = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => fileFilter(req, file, cb),
});

export const uploadImage = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => fileFilter(req, file, cb),
});

export const uploadAvatar = uploadImage.single('avatar');
export const uploadSentenceAudio = uploadAudio.single('audio');
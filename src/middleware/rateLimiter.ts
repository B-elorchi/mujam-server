import rateLimit from 'express-rate-limit';
import { extractInviteApiKey } from './inviteApiKey';

const isTest = process.env.NODE_ENV === 'test';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100_000 : 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100_000 : 10,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100_000 : 20,
  message: { success: false, message: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate-limit only automation (API key) traffic on invite admin routes; JWT admin panel is skipped. */
export const inviteApiKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 100_000 : 60,
  message: { success: false, message: 'Too many invite API key requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => extractInviteApiKey(req) === null,
});

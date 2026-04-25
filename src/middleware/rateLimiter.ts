import rateLimit from 'express-rate-limit';

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
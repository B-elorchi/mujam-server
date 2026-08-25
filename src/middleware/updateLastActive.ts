import { Request, Response, NextFunction } from 'express';
import { touchSession } from '../services/sessionTracking.service';

/** Lightweight presence: extends session + lastActiveAt (fire-and-forget safe). */
export const updateLastActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.userId) {
      await touchSession(req.userId);
    }
    next();
  } catch (error) {
    next();
  }
};
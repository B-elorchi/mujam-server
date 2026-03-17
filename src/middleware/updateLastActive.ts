import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export const updateLastActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.userId) {
      await prisma.user.update({
        where: { id: req.userId },
        data: { lastActiveAt: new Date() },
      });
    }
    next();
  } catch (error) {
    next();
  }
};
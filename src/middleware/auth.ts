import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import prisma from '../config/database';
import { errorResponse } from '../utils/apiResponse';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      userId?: string;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      errorResponse(res, 'No token provided', 401);
      return;
    }
    
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, role: true },
    });
    
    if (!user || !user.isActive) {
      errorResponse(res, 'User not found or inactive', 401);
      return;
    }
    
    req.user = payload;
    req.userId = payload.userId;
    
    next();
  } catch (error) {
    errorResponse(res, 'Invalid or expired token', 401);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }
    
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true },
    });
    
    if (user && user.isActive) {
      req.user = payload;
      req.userId = payload.userId;
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }
  
  next();
};
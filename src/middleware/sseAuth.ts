import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/database';
import { errorResponse } from '../utils/apiResponse';

/**
 * Authenticates SSE clients: Bearer header or `?token=` (EventSource cannot set custom headers in the browser).
 */
export async function sseAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const q = req.query.token;
    const tokenFromQuery = typeof q === 'string' && q.length > 0 ? q : undefined;
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : undefined;
    const jwt = tokenFromQuery || bearer;
    if (!jwt) {
      errorResponse(res, 'No token provided', 401);
      return;
    }
    const payload = verifyAccessToken(jwt);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      errorResponse(res, 'User not found or inactive', 401);
      return;
    }
    req.userId = payload.userId;
    next();
  } catch {
    errorResponse(res, 'Invalid or expired token', 401);
  }
}

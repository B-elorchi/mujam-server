import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/database';
import { errorResponse } from '../utils/apiResponse';
import { readAccessCookie } from '../utils/authCookies';

/**
 * Authenticates SSE clients: Bearer header, HttpOnly access cookie, or short-lived
 * query token (legacy EventSource clients that cannot send headers).
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
    const jwt = bearer || readAccessCookie(req) || tokenFromQuery;
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

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import prisma from '../config/database';
import { errorResponse } from '../utils/apiResponse';
import { readAccessCookie } from '../utils/authCookies';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      userId?: string;
      accessMoajam?: boolean;
      accessKids?: boolean;
    }
  }
}

async function hydrateUser(req: Request, token: string): Promise<boolean> {
  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isActive: true, role: true, accessMoajam: true, accessKids: true },
  });

  if (!user || !user.isActive) return false;

  req.user = { ...payload, role: user.role };
  req.userId = payload.userId;
  req.accessMoajam = user.accessMoajam;
  req.accessKids = user.accessKids;
  return true;
}

function bearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  return authHeader.split(' ')[1];
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = bearerToken(req);
    if (!token) {
      errorResponse(res, 'No token provided', 401);
      return;
    }
    const ok = await hydrateUser(req, token);
    if (!ok) {
      errorResponse(res, 'User not found or inactive', 401);
      return;
    }
    next();
  } catch {
    errorResponse(res, 'Invalid or expired token', 401);
  }
};

/** GET media/SSE: Bearer header or HttpOnly access cookie (no CSRF body). */
export const cookieOrBearerAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = bearerToken(req) || readAccessCookie(req);
    if (!token) {
      errorResponse(res, 'No token provided', 401);
      return;
    }
    const ok = await hydrateUser(req, token);
    if (!ok) {
      errorResponse(res, 'User not found or inactive', 401);
      return;
    }
    next();
  } catch {
    errorResponse(res, 'Invalid or expired token', 401);
  }
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = bearerToken(req);
    if (!token) {
      next();
      return;
    }
    await hydrateUser(req, token);
  } catch {
    /* ignore */
  }
  next();
};

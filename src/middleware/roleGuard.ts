import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { errorResponse } from '../utils/apiResponse';

const STAFF_ROLES = new Set(['ADMIN', 'EDITOR', 'AI_MANAGER', 'MARKETER']);

/** Adult Moajam learner APIs. Kids-only accounts are blocked; staff always pass. */
export const moajamAccessGuard = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.userId) {
    errorResponse(res, 'Authentication required', 401);
    return;
  }

  if (req.user && STAFF_ROLES.has(req.user.role)) {
    next();
    return;
  }

  if (req.accessMoajam === false) {
    errorResponse(res, 'Moajam access required', 403);
    return;
  }

  next();
};

/** Allow PREMIUM plan or ADMIN role to access premium-only features */
export const planGuard = (requiredPlan: 'PREMIUM') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });

      if (!user) {
        errorResponse(res, 'User not found', 404);
        return;
      }

      const hasAccess = user.plan === 'PREMIUM' || user.role === 'ADMIN';
      if (requiredPlan === 'PREMIUM' && !hasAccess) {
        errorResponse(res, 'Premium subscription required', 403);
        return;
      }

      next();
    } catch (error) {
      errorResponse(res, 'Server error', 500);
    }
  };
};

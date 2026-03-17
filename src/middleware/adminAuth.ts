import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/apiResponse';

export const adminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    errorResponse(res, 'Authentication required', 401);
    return;
  }

  const adminRoles = ['ADMIN', 'EDITOR', 'AI_MANAGER', 'MARKETER'];
  
  if (!adminRoles.includes(req.user.role)) {
    errorResponse(res, 'Admin access required', 403);
    return;
  }

  next();
};

export const superAdminMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    errorResponse(res, 'Authentication required', 401);
    return;
  }

  if (req.user.role !== 'ADMIN') {
    errorResponse(res, 'Super admin access required', 403);
    return;
  }

  next();
};

export const roleGuard = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      errorResponse(res, 'Insufficient permissions', 403);
      return;
    }

    next();
  };
};
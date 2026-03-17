import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { errorResponse } from '../utils/apiResponse';

export const maintenanceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const adminRoles = ['ADMIN', 'EDITOR', 'AI_MANAGER', 'MARKETER'];
    if (req.user && adminRoles.includes(req.user.role)) {
      return next();
    }

    const settings = await prisma.platformSettings.findFirst();
    
    if (settings?.maintenanceMode) {
      return errorResponse(
        res,
        settings.maintenanceMessage || 'Site is under maintenance',
        503
      );
    }

    next();
  } catch (error) {
    next();
  }
};

export const featureFlagMiddleware = (flagName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const settings = await prisma.platformSettings.findFirst();
      const flags = (settings?.featureFlags as Record<string, boolean>) || {};
      
      if (flags[flagName] === false) {
        return errorResponse(res, 'This feature is currently disabled', 403);
      }

      next();
    } catch (error) {
      next();
    }
  };
};
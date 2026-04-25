import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/apiResponse';

/** Temporary: premium-gated features are open to all authenticated users */
export const planGuard = (requiredPlan: 'PREMIUM') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }
    void requiredPlan;
    next();
  };
};
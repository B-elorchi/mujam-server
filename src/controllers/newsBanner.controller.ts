import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

const publicSelect = {
  id: true,
  messageAr: true,
  linkUrl: true,
  orderIndex: true,
  bgColor: true,
  textColor: true,
} as const;

/** Public: active banners ordered for the learner NewsBar */
export const newsBannerController = {
  listActive: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const items = await prisma.newsBanner.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: publicSelect,
      });
      return successResponse(res, items);
    } catch (error) {
      console.error('List active news banners error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

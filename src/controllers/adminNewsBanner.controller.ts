import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const adminNewsBannerController = {
  list: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const items = await prisma.newsBanner.findMany({
        orderBy: { orderIndex: 'asc' },
      });
      return successResponse(res, items);
    } catch (error) {
      console.error('Admin list news banners error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const {
        messageAr,
        linkUrl,
        isActive = true,
        orderIndex,
        bgColor,
        textColor,
      } = req.body as {
        messageAr: string;
        linkUrl?: string | null;
        isActive?: boolean;
        orderIndex?: number;
        bgColor?: string | null;
        textColor?: string | null;
      };

      let nextOrder = orderIndex;
      if (nextOrder === undefined || nextOrder === null) {
        const max = await prisma.newsBanner.aggregate({ _max: { orderIndex: true } });
        nextOrder = (max._max.orderIndex ?? -1) + 1;
      }

      const item = await prisma.newsBanner.create({
        data: {
          messageAr: messageAr.trim(),
          linkUrl: linkUrl?.trim() || null,
          isActive: Boolean(isActive),
          orderIndex: Number(nextOrder),
          bgColor: bgColor?.trim() || null,
          textColor: textColor?.trim() || null,
        },
      });

      return successResponse(res, item, 'News banner created', 201);
    } catch (error) {
      console.error('Create news banner error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  update: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const id = req.params.id as string;
      const existing = await prisma.newsBanner.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'News banner not found', 404);
      }

      const { messageAr, linkUrl, isActive, orderIndex, bgColor, textColor } = req.body as {
        messageAr?: string;
        linkUrl?: string | null;
        isActive?: boolean;
        orderIndex?: number;
        bgColor?: string | null;
        textColor?: string | null;
      };

      const item = await prisma.newsBanner.update({
        where: { id },
        data: {
          ...(messageAr !== undefined && { messageAr: messageAr.trim() }),
          ...(linkUrl !== undefined && { linkUrl: linkUrl?.trim() || null }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(orderIndex !== undefined && { orderIndex: Number(orderIndex) }),
          ...(bgColor !== undefined && { bgColor: bgColor?.trim() || null }),
          ...(textColor !== undefined && { textColor: textColor?.trim() || null }),
        },
      });

      return successResponse(res, item, 'News banner updated');
    } catch (error) {
      console.error('Update news banner error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  remove: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const existing = await prisma.newsBanner.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'News banner not found', 404);
      }

      await prisma.newsBanner.delete({ where: { id } });
      return successResponse(res, null, 'News banner deleted');
    } catch (error) {
      console.error('Delete news banner error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  reorder: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { items } = req.body as { items?: { id: string; orderIndex: number }[] };

      if (!Array.isArray(items) || items.length === 0) {
        return errorResponse(res, 'items must be a non-empty array', 400);
      }

      await prisma.$transaction(
        items.map((item) =>
          prisma.newsBanner.update({
            where: { id: item.id },
            data: { orderIndex: Number(item.orderIndex) },
          })
        )
      );

      const updated = await prisma.newsBanner.findMany({
        orderBy: { orderIndex: 'asc' },
      });

      return successResponse(res, updated, 'News banners reordered');
    } catch (error) {
      console.error('Reorder news banners error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

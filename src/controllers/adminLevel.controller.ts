import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const adminLevelController = {
  // GET all levels
  getLevels: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const levels = await prisma.level.findMany({
        orderBy: { orderIndex: 'asc' },
        include: {
          _count: {
            select: { sentences: true },
          },
        },
      });

      return successResponse(res, levels);
    } catch (error) {
      console.error('Get levels error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // GET single level
  getLevel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id as string);

      const level = await prisma.level.findUnique({
        where: { id },
        include: {
          _count: {
            select: { sentences: true },
          },
        },
      });

      if (!level) {
        return errorResponse(res, 'المستوى غير موجود', 404);
      }

      return successResponse(res, level);
    } catch (error) {
      console.error('Get level error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST create level
  createLevel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { id, titleAr, titleEn, descriptionAr, icon, orderIndex, isFree } = req.body;

      // Check if level ID already exists
      const existing = await prisma.level.findUnique({ where: { id } });
      if (existing) {
        return errorResponse(res, 'المستوى موجود بالفعل', 400);
      }

      const level = await prisma.level.create({
        data: {
          id,
          titleAr,
          titleEn,
          descriptionAr,
          icon,
          orderIndex,
          isFree,
        },
      });

      return successResponse(res, level, 'تم إنشاء المستوى بنجاح', 201);
    } catch (error) {
      console.error('Create level error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // PATCH update level
  updateLevel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const id = parseInt(req.params.id as string);
      const { titleAr, titleEn, descriptionAr, icon, orderIndex, isFree } = req.body;

      const existing = await prisma.level.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'المستوى غير موجود', 404);
      }

      const updateData: any = {};
      if (titleAr !== undefined) updateData.titleAr = titleAr;
      if (titleEn !== undefined) updateData.titleEn = titleEn;
      if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
      if (icon !== undefined) updateData.icon = icon;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      if (isFree !== undefined) updateData.isFree = isFree;

      const level = await prisma.level.update({
        where: { id },
        data: updateData,
      });

      return successResponse(res, level, 'تم تحديث المستوى بنجاح');
    } catch (error) {
      console.error('Update level error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // DELETE level
  deleteLevel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = parseInt(req.params.id as string);

      const existing = await prisma.level.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'Level not found', 404);
      }

      await prisma.level.delete({ where: { id } });
      return successResponse(res, null, 'Level deleted successfully');
    } catch (error) {
      console.error('Delete level error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

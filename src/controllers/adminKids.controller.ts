import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

const KIDS_COLORS = ['blue', 'sky', 'yellow', 'pink', 'green', 'purple', 'orange'] as const;

function paramId(req: Request, key = 'id'): string {
  const raw = req.params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

export const adminKidsController = {
  listModules: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const modules = await prisma.kidsModule.findMany({
        orderBy: { orderIndex: 'asc' },
        include: { _count: { select: { screens: true } } },
      });
      return successResponse(
        res,
        modules.map((m) => ({
          id: m.id,
          titleEn: m.titleEn,
          titleAr: m.titleAr,
          icon: m.icon,
          color: m.color,
          orderIndex: m.orderIndex,
          isActive: m.isActive,
          progress: m.progress,
          stars: m.stars,
          screenCount: m._count.screens,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }))
      );
    } catch (error) {
      console.error('Admin list kids modules error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const mod = await prisma.kidsModule.findUnique({
        where: { id },
        include: { screens: { orderBy: { orderIndex: 'asc' } } },
      });
      if (!mod) return errorResponse(res, 'Module not found', 404);
      return successResponse(res, mod);
    } catch (error) {
      console.error('Admin get kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const { id, titleEn, titleAr, icon, color, orderIndex, isActive } = req.body as {
        id: string;
        titleEn: string;
        titleAr: string;
        icon?: string;
        color?: string;
        orderIndex?: number;
        isActive?: boolean;
      };

      const existing = await prisma.kidsModule.findUnique({ where: { id: id.trim() } });
      if (existing) return errorResponse(res, 'Module id already exists', 409);

      let nextOrder = orderIndex;
      if (nextOrder === undefined || nextOrder === null) {
        const max = await prisma.kidsModule.aggregate({ _max: { orderIndex: true } });
        nextOrder = (max._max.orderIndex ?? -1) + 1;
      }

      const mod = await prisma.kidsModule.create({
        data: {
          id: id.trim(),
          titleEn: titleEn.trim(),
          titleAr: titleAr.trim(),
          icon: icon?.trim() || '📚',
          color: KIDS_COLORS.includes(color as (typeof KIDS_COLORS)[number]) ? color! : 'blue',
          orderIndex: Number(nextOrder),
          isActive: isActive !== false,
        },
      });

      return successResponse(res, mod, 'Kids module created', 201);
    } catch (error) {
      console.error('Create kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const id = paramId(req);
      const existing = await prisma.kidsModule.findUnique({ where: { id } });
      if (!existing) return errorResponse(res, 'Module not found', 404);

      const { titleEn, titleAr, icon, color, orderIndex, isActive, progress, stars } = req.body as {
        titleEn?: string;
        titleAr?: string;
        icon?: string;
        color?: string;
        orderIndex?: number;
        isActive?: boolean;
        progress?: number;
        stars?: number;
      };

      const mod = await prisma.kidsModule.update({
        where: { id },
        data: {
          ...(titleEn !== undefined && { titleEn: titleEn.trim() }),
          ...(titleAr !== undefined && { titleAr: titleAr.trim() }),
          ...(icon !== undefined && { icon: icon.trim() }),
          ...(color !== undefined &&
            KIDS_COLORS.includes(color as (typeof KIDS_COLORS)[number]) && { color }),
          ...(orderIndex !== undefined && { orderIndex: Number(orderIndex) }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(progress !== undefined && { progress: Math.min(100, Math.max(0, Number(progress))) }),
          ...(stars !== undefined && { stars: Math.min(3, Math.max(0, Number(stars))) }),
        },
      });

      return successResponse(res, mod, 'Kids module updated');
    } catch (error) {
      console.error('Update kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  removeModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const existing = await prisma.kidsModule.findUnique({ where: { id } });
      if (!existing) return errorResponse(res, 'Module not found', 404);

      await prisma.kidsModule.update({
        where: { id },
        data: { isActive: false },
      });
      return successResponse(res, null, 'Kids module deactivated');
    } catch (error) {
      console.error('Delete kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createScreen: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const moduleId = paramId(req);
      const mod = await prisma.kidsModule.findUnique({ where: { id: moduleId } });
      if (!mod) return errorResponse(res, 'Module not found', 404);

      const { type, orderIndex, payload } = req.body as {
        type: string;
        orderIndex?: number;
        payload?: Record<string, unknown>;
      };

      let nextOrder = orderIndex;
      if (nextOrder === undefined || nextOrder === null) {
        const max = await prisma.kidsLessonScreen.aggregate({
          where: { moduleId },
          _max: { orderIndex: true },
        });
        nextOrder = (max._max.orderIndex ?? -1) + 1;
      }

      const screen = await prisma.kidsLessonScreen.create({
        data: {
          moduleId,
          type: type.trim(),
          orderIndex: Number(nextOrder),
          payload: (payload ?? {}) as Prisma.InputJsonValue,
        },
      });

      return successResponse(res, screen, 'Lesson screen created', 201);
    } catch (error) {
      console.error('Create kids screen error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateScreen: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const screenId = paramId(req);
      const existing = await prisma.kidsLessonScreen.findUnique({ where: { id: screenId } });
      if (!existing) return errorResponse(res, 'Screen not found', 404);

      const { type, orderIndex, payload } = req.body as {
        type?: string;
        orderIndex?: number;
        payload?: Record<string, unknown>;
      };

      const screen = await prisma.kidsLessonScreen.update({
        where: { id: screenId },
        data: {
          ...(type !== undefined && { type: type.trim() }),
          ...(orderIndex !== undefined && { orderIndex: Number(orderIndex) }),
          ...(payload !== undefined && { payload: payload as Prisma.InputJsonValue }),
        },
      });

      return successResponse(res, screen, 'Lesson screen updated');
    } catch (error) {
      console.error('Update kids screen error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  removeScreen: async (req: Request, res: Response): Promise<Response> => {
    try {
      const screenId = paramId(req);
      const existing = await prisma.kidsLessonScreen.findUnique({ where: { id: screenId } });
      if (!existing) return errorResponse(res, 'Screen not found', 404);

      await prisma.kidsLessonScreen.delete({ where: { id: screenId } });
      return successResponse(res, null, 'Lesson screen deleted');
    } catch (error) {
      console.error('Delete kids screen error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  reorderScreens: async (req: Request, res: Response): Promise<Response> => {
    try {
      const moduleId = paramId(req);
      const { items } = req.body as { items?: { id: string; orderIndex: number }[] };

      if (!Array.isArray(items) || items.length === 0) {
        return errorResponse(res, 'items must be a non-empty array', 400);
      }

      await prisma.$transaction(
        items.map((item) =>
          prisma.kidsLessonScreen.update({
            where: { id: item.id },
            data: { orderIndex: Number(item.orderIndex) },
          })
        )
      );

      const screens = await prisma.kidsLessonScreen.findMany({
        where: { moduleId },
        orderBy: { orderIndex: 'asc' },
      });

      return successResponse(res, screens, 'Screens reordered');
    } catch (error) {
      console.error('Reorder kids screens error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

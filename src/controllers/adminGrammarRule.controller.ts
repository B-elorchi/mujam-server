import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const adminGrammarRuleController = {
  list: async (req: Request, res: Response): Promise<Response> => {
    try {
      const raw = req.query.levelId as string | undefined;
      const levelId = raw !== undefined ? parseInt(raw, 10) : undefined;
      if (raw !== undefined && Number.isNaN(levelId)) {
        return errorResponse(res, 'Invalid levelId', 400);
      }

      const rules = await prisma.grammarRule.findMany({
        where: levelId !== undefined ? { levelId } : undefined,
        orderBy: [{ levelId: 'asc' }, { orderIndex: 'asc' }],
      });

      return successResponse(res, { rules });
    } catch (error) {
      console.error('Admin list grammar rules error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getOne: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const rule = await prisma.grammarRule.findUnique({ where: { id } });
      if (!rule) {
        return errorResponse(res, 'Grammar rule not found', 404);
      }
      return successResponse(res, { rule });
    } catch (error) {
      console.error('Admin get grammar rule error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { levelId, titleAr, titleEn, explanation, examples, exercises, orderIndex } = req.body as {
        levelId: number;
        titleAr: string;
        titleEn: string;
        explanation: string;
        examples: unknown;
        exercises?: unknown;
        orderIndex: number;
      };

      const level = await prisma.level.findUnique({ where: { id: levelId } });
      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }
      if (level.levelType !== 'grammar') {
        return errorResponse(res, 'Target level must be a grammar level', 400);
      }

      const rule = await prisma.grammarRule.create({
        data: {
          levelId,
          titleAr,
          titleEn,
          explanation,
          examples: examples as object,
          ...(exercises !== undefined && { exercises: exercises as object }),
          orderIndex,
          isActive: true,
        },
      });

      return successResponse(res, { rule }, 'Created', 201);
    } catch (error) {
      console.error('Admin create grammar rule error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  patch: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const id = req.params.id as string;
      const existing = await prisma.grammarRule.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'Grammar rule not found', 404);
      }

      const payload = req.body as {
        titleAr?: string;
        titleEn?: string;
        explanation?: string;
        examples?: unknown;
        exercises?: unknown;
        orderIndex?: number;
        isActive?: boolean;
      };

      const rule = await prisma.grammarRule.update({
        where: { id },
        data: {
          ...(payload.titleAr !== undefined && { titleAr: payload.titleAr }),
          ...(payload.titleEn !== undefined && { titleEn: payload.titleEn }),
          ...(payload.explanation !== undefined && { explanation: payload.explanation }),
          ...(payload.examples !== undefined && { examples: payload.examples as object }),
          ...(payload.exercises !== undefined && { exercises: payload.exercises as object }),
          ...(payload.orderIndex !== undefined && { orderIndex: payload.orderIndex }),
          ...(payload.isActive !== undefined && { isActive: payload.isActive }),
        },
      });

      return successResponse(res, { rule }, 'Updated');
    } catch (error) {
      console.error('Admin patch grammar rule error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  softDelete: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const existing = await prisma.grammarRule.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'Grammar rule not found', 404);
      }

      await prisma.grammarRule.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(res, null, 'Deactivated');
    } catch (error) {
      console.error('Admin delete grammar rule error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

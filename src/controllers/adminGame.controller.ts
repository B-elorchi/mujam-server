import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const adminGameController = {
  // GET games for a level
  getGames: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = req.query.levelId ? parseInt(req.query.levelId as string) : undefined;

      const where: any = {};
      if (levelId) {
        where.levelId = levelId;
      }

      const games = await prisma.game.findMany({
        where,
        orderBy: { orderIndex: 'asc' },
        include: {
          _count: {
            select: { questions: true },
          },
          level: {
            select: { titleAr: true, titleEn: true },
          },
        },
      });

      return successResponse(res, games);
    } catch (error) {
      console.error('Get games error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // GET single game with questions
  getGame: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const game = await prisma.game.findUnique({
        where: { id },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
          },
          level: {
            select: { titleAr: true, titleEn: true },
          },
        },
      });

      if (!game) {
        return errorResponse(res, 'اللعبة غير موجودة', 404);
      }

      return successResponse(res, game);
    } catch (error) {
      console.error('Get game error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST create game
  createGame: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { levelId, type, titleAr, titleEn, descriptionAr, orderIndex } = req.body;

      // Check if level exists
      const level = await prisma.level.findUnique({ where: { id: levelId } });
      if (!level) {
        return errorResponse(res, 'المستوى غير موجود', 404);
      }

      const game = await prisma.game.create({
        data: {
          levelId,
          type,
          titleAr,
          titleEn,
          descriptionAr,
          orderIndex,
        },
      });

      return successResponse(res, game, 'تم إنشاء اللعبة بنجاح', 201);
    } catch (error) {
      console.error('Create game error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // PATCH update game
  updateGame: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const id = req.params.id as string;
      const { titleAr, titleEn, descriptionAr, orderIndex, isActive } = req.body;

      const existing = await prisma.game.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'اللعبة غير موجودة', 404);
      }

      const updateData: any = {};
      if (titleAr !== undefined) updateData.titleAr = titleAr;
      if (titleEn !== undefined) updateData.titleEn = titleEn;
      if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      if (isActive !== undefined) updateData.isActive = isActive;

      const game = await prisma.game.update({
        where: { id },
        data: updateData,
      });

      return successResponse(res, game, 'تم تحديث اللعبة بنجاح');
    } catch (error) {
      console.error('Update game error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // DELETE game (soft delete)
  deleteGame: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const existing = await prisma.game.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'اللعبة غير موجودة', 404);
      }

      await prisma.game.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(res, null, 'تم حذف اللعبة بنجاح');
    } catch (error) {
      console.error('Delete game error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST add question to game
  addQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const gameId = req.params.id as string;
      const { sentenceId, questionData, correctAnswer, orderIndex } = req.body;

      // Check if game exists
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game) {
        return errorResponse(res, 'اللعبة غير موجودة', 404);
      }

      const question = await prisma.gameQuestion.create({
        data: {
          gameId,
          sentenceId,
          questionData,
          correctAnswer,
          orderIndex,
        },
      });

      return successResponse(res, question, 'تم إضافة السؤال بنجاح', 201);
    } catch (error) {
      console.error('Add question error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // PATCH update question
  updateQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const questionId = req.params.questionId as string;
      const { questionData, correctAnswer, orderIndex } = req.body;

      const existing = await prisma.gameQuestion.findUnique({ where: { id: questionId } });
      if (!existing) {
        return errorResponse(res, 'السؤال غير موجود', 404);
      }

      const updateData: any = {};
      if (questionData !== undefined) updateData.questionData = questionData;
      if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;

      const question = await prisma.gameQuestion.update({
        where: { id: questionId },
        data: updateData,
      });

      return successResponse(res, question, 'تم تحديث السؤال بنجاح');
    } catch (error) {
      console.error('Update question error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // DELETE question
  deleteQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const questionId = req.params.questionId as string;

      const existing = await prisma.gameQuestion.findUnique({ where: { id: questionId } });
      if (!existing) {
        return errorResponse(res, 'السؤال غير موجود', 404);
      }

      await prisma.gameQuestion.delete({
        where: { id: questionId },
      });

      return successResponse(res, null, 'تم حذف السؤال بنجاح');
    } catch (error) {
      console.error('Delete question error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },
};

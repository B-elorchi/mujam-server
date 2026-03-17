import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const adminQuizController = {
  // GET all quizzes
  getQuizzes: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = req.query.levelId ? parseInt(req.query.levelId as string) : undefined;

      const where: any = {};
      if (levelId) {
        where.levelId = levelId;
      }

      const quizzes = await prisma.levelQuiz.findMany({
        where,
        include: {
          level: {
            select: { titleAr: true, titleEn: true },
          },
          _count: {
            select: { questions: true },
          },
        },
        orderBy: { levelId: 'asc' },
      });

      return successResponse(res, quizzes);
    } catch (error) {
      console.error('Get quizzes error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // GET single quiz with questions
  getQuiz: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const quiz = await prisma.levelQuiz.findUnique({
        where: { id },
        include: {
          level: {
            select: { titleAr: true, titleEn: true },
          },
          questions: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!quiz) {
        return errorResponse(res, 'الاختبار غير موجود', 404);
      }

      return successResponse(res, quiz);
    } catch (error) {
      console.error('Get quiz error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST create quiz
  createQuiz: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { levelId, passScore, maxAttempts, timeLimit } = req.body;

      // Check if level exists
      const level = await prisma.level.findUnique({ where: { id: levelId } });
      if (!level) {
        return errorResponse(res, 'المستوى غير موجود', 404);
      }

      // Check if quiz already exists for this level
      const existing = await prisma.levelQuiz.findUnique({ where: { levelId } });
      if (existing) {
        return errorResponse(res, 'يوجد اختبار بالفعل لهذا المستوى', 400);
      }

      const quiz = await prisma.levelQuiz.create({
        data: {
          levelId,
          passScore: passScore || 70,
          maxAttempts: maxAttempts || 3,
          timeLimit,
        },
      });

      return successResponse(res, quiz, 'تم إنشاء الاختبار بنجاح', 201);
    } catch (error) {
      console.error('Create quiz error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // PATCH update quiz
  updateQuiz: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const id = req.params.id as string;
      const { passScore, maxAttempts, timeLimit } = req.body;

      const existing = await prisma.levelQuiz.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'الاختبار غير موجود', 404);
      }

      const updateData: any = {};
      if (passScore !== undefined) updateData.passScore = passScore;
      if (maxAttempts !== undefined) updateData.maxAttempts = maxAttempts;
      if (timeLimit !== undefined) updateData.timeLimit = timeLimit;

      const quiz = await prisma.levelQuiz.update({
        where: { id },
        data: updateData,
      });

      return successResponse(res, quiz, 'تم تحديث الاختبار بنجاح');
    } catch (error) {
      console.error('Update quiz error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // DELETE quiz
  deleteQuiz: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const existing = await prisma.levelQuiz.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'الاختبار غير موجود', 404);
      }

      // Delete quiz and cascade delete questions
      await prisma.levelQuiz.delete({
        where: { id },
      });

      return successResponse(res, null, 'تم حذف الاختبار بنجاح');
    } catch (error) {
      console.error('Delete quiz error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST add question to quiz
  addQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const quizId = req.params.id as string;
      const { sentenceId, type, questionData, correctAnswer, points, orderIndex } = req.body;

      // Check if quiz exists
      const quiz = await prisma.levelQuiz.findUnique({ where: { id: quizId } });
      if (!quiz) {
        return errorResponse(res, 'الاختبار غير موجود', 404);
      }

      const question = await prisma.quizQuestion.create({
        data: {
          quizId,
          sentenceId,
          type,
          questionData,
          correctAnswer,
          points: points || 10,
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
      const { questionData, correctAnswer, points, orderIndex } = req.body;

      const existing = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
      if (!existing) {
        return errorResponse(res, 'السؤال غير موجود', 404);
      }

      const updateData: any = {};
      if (questionData !== undefined) updateData.questionData = questionData;
      if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer;
      if (points !== undefined) updateData.points = points;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;

      const question = await prisma.quizQuestion.update({
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

      const existing = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
      if (!existing) {
        return errorResponse(res, 'السؤال غير موجود', 404);
      }

      await prisma.quizQuestion.delete({
        where: { id: questionId },
      });

      return successResponse(res, null, 'تم حذف السؤال بنجاح');
    } catch (error) {
      console.error('Delete question error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },
};

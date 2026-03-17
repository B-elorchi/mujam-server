import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const adminPlacementController = {
  // GET all placement questions with optional filter by targetLevel
  getQuestions: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { targetLevel } = req.query;
      
      const where: any = {};
      if (targetLevel) {
        where.targetLevel = parseInt(targetLevel as string);
      }

      const questions = await prisma.placementQuestion.findMany({
        where,
        orderBy: { orderIndex: 'asc' },
      });

      return successResponse(res, questions);
    } catch (error) {
      console.error('Get placement questions error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  // GET single placement question by ID
  getQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const question = await prisma.placementQuestion.findUnique({
        where: { id },
      });

      if (!question) {
        return errorResponse(res, 'Question not found', 404);
      }

      return successResponse(res, question);
    } catch (error) {
      console.error('Get placement question error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  // POST create new placement question
  createQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { sentenceEn, correctAr, options, targetLevel, orderIndex } = req.body;

      // Validate that correctAr is one of the options
      if (!options.includes(correctAr)) {
        return errorResponse(res, 'correctAr must be one of the options', 400);
      }

      // Validate exactly 4 options
      if (options.length !== 4) {
        return errorResponse(res, 'Must provide exactly 4 options', 400);
      }

      const question = await prisma.placementQuestion.create({
        data: {
          sentenceEn,
          correctAr,
          options,
          targetLevel,
          orderIndex,
          isActive: true,
        },
      });

      return successResponse(res, question, 'Question created successfully', 201);
    } catch (error) {
      console.error('Create placement question error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  // PATCH update placement question
  updateQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const id = req.params.id as string;
      const { sentenceEn, correctAr, options, targetLevel, orderIndex, isActive } = req.body;

      const existing = await prisma.placementQuestion.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse(res, 'Question not found', 404);
      }

      // Validate that correctAr is one of the options if both are provided
      if (options && correctAr && !options.includes(correctAr)) {
        return errorResponse(res, 'correctAr must be one of the options', 400);
      }

      // Validate exactly 4 options if provided
      if (options && options.length !== 4) {
        return errorResponse(res, 'Must provide exactly 4 options', 400);
      }

      const updateData: any = {};
      if (sentenceEn !== undefined) updateData.sentenceEn = sentenceEn;
      if (correctAr !== undefined) updateData.correctAr = correctAr;
      if (options !== undefined) updateData.options = options;
      if (targetLevel !== undefined) updateData.targetLevel = targetLevel;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      if (isActive !== undefined) updateData.isActive = isActive;

      const question = await prisma.placementQuestion.update({
        where: { id },
        data: updateData,
      });

      return successResponse(res, question, 'Question updated successfully');
    } catch (error) {
      console.error('Update placement question error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  // DELETE (soft delete) placement question
  deleteQuestion: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const existing = await prisma.placementQuestion.findUnique({
        where: { id },
      });

      if (!existing) {
        return errorResponse(res, 'Question not found', 404);
      }

      // Soft delete by setting isActive to false
      await prisma.placementQuestion.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(res, null, 'Question deleted successfully');
    } catch (error) {
      console.error('Delete placement question error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  // POST reorder placement questions
  reorderQuestions: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { questions } = req.body;

      if (!Array.isArray(questions)) {
        return errorResponse(res, 'questions must be an array', 400);
      }

      // Update orderIndex for each question
      await prisma.$transaction(
        questions.map((q: { id: string; orderIndex: number }) =>
          prisma.placementQuestion.update({
            where: { id: q.id },
            data: { orderIndex: q.orderIndex },
          })
        )
      );

      return successResponse(res, null, 'Questions reordered successfully');
    } catch (error) {
      console.error('Reorder placement questions error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

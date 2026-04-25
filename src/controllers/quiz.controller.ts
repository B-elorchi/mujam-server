import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { checkLevelCompletion } from '../utils/progress.utils';
import { trackLearningActivity } from '../utils/gamification';

export const quizController = {
  getQuiz: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const levelId = parseInt(id);

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }


      const level = await prisma.level.findUnique({
        where: { id: levelId },
        select: { isFree: true },
      });

      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }

      const quiz = await prisma.levelQuiz.findUnique({
        where: { levelId },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!quiz) {
        return errorResponse(res, 'Quiz not found', 404);
      }

      const attemptCount = await prisma.userQuizAttempt.count({
        where: {
          userId: req.userId,
          quizId: quiz.id,
        },
      });

      const quizAny = quiz as any;
      const questionsWithoutAnswers = quizAny.questions.map((q: any) => ({
        id: q.id,
        questionData: q.questionData,
        type: q.type,
        points: q.points,
        orderIndex: q.orderIndex,
      }));

      return successResponse(res, {
        id: quiz.id,
        levelId: quiz.levelId,
        passScore: quiz.passScore,
        maxAttempts: quiz.maxAttempts,
        timeLimit: quiz.timeLimit,
        attemptsLeft: quiz.maxAttempts - attemptCount,
        questions: questionsWithoutAnswers,
      });
    } catch (error) {
      console.error('Get quiz error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  submitQuiz: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const { answers } = req.body as { answers: { questionId: string; answer: string }[] };

      const quiz = await prisma.levelQuiz.findUnique({
        where: { levelId: parseInt(id) },
        include: {
          questions: true,
        },
      });

      if (!quiz) {
        return errorResponse(res, 'Quiz not found', 404);
      }

      const attemptCount = await prisma.userQuizAttempt.count({
        where: {
          userId: req.userId,
          quizId: quiz.id,
        },
      });

      if (attemptCount >= quiz.maxAttempts) {
        return errorResponse(res, 'Maximum attempts reached', 429);
      }

      let totalPoints = 0;
      let earnedPoints = 0;
      const questionMap = new Map(quiz.questions.map((q: any) => [q.id, q]));

      const quizAny = quiz as any;
      const gradedAnswers = answers.map((answer) => {
        const question = questionMap.get(answer.questionId) as any;
        totalPoints += question?.points || 10;
        const isCorrect = question && question.correctAnswer.toLowerCase() === answer.answer.toLowerCase().trim();
        if (isCorrect) {
          earnedPoints += question?.points || 10;
        }
        return {
          questionId: answer.questionId,
          answer: answer.answer,
          correct: isCorrect,
        };
      });

      const score = Math.round((earnedPoints / totalPoints) * 100);
      const passed = score >= quiz.passScore;

      const attempt = await prisma.userQuizAttempt.create({
        data: {
          userId: req.userId!,
          quizId: quiz.id,
          score,
          passed,
          answers: gradedAnswers as any,
        },
      });

      let levelCompleted = false;
      let nextLevelId = null;

      if (passed) {
        const completion = await prisma.userLevelCompletion.findUnique({
          where: {
            userId_levelId: {
              userId: req.userId!,
              levelId: quiz.levelId,
            },
          },
        });

        if (completion) {
          await prisma.userLevelCompletion.update({
            where: { id: completion.id },
            data: { quizPassed: true },
          });
        } else {
          await prisma.userLevelCompletion.create({
            data: {
              userId: req.userId!,
              levelId: quiz.levelId,
              quizPassed: true,
            },
          });
        }

        // Check if entire level is completed
        levelCompleted = await checkLevelCompletion(req.userId!, quiz.levelId);

        // Track learning activity for gamification (streak, points, achievements)
        await trackLearningActivity(req.userId!, 'quiz');

        if (levelCompleted) {
          const nextLevel = await prisma.level.findFirst({
            where: { orderIndex: { gt: quiz.levelId } },
            orderBy: { orderIndex: 'asc' },
            select: { id: true },
          });
          nextLevelId = nextLevel?.id || null;
        }
      }

      return successResponse(res, {
        attemptId: attempt.id,
        score,
        passed,
        earnedPoints,
        totalPoints,
        attemptsLeft: quiz.maxAttempts - attemptCount - 1,
        levelCompleted,
        nextLevelId,
      });
    } catch (error) {
      console.error('Submit quiz error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getAttempts: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const quiz = await prisma.levelQuiz.findUnique({
        where: { levelId: parseInt(id) },
      });

      if (!quiz) {
        return errorResponse(res, 'Quiz not found', 404);
      }

      const attempts = await prisma.userQuizAttempt.findMany({
        where: {
          userId: req.userId,
          quizId: quiz.id,
        },
        orderBy: { attemptedAt: 'desc' },
      });

      return successResponse(res, attempts);
    } catch (error) {
      console.error('Get attempts error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

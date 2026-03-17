import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { checkLevelCompletion } from '../utils/progress.utils';
import { trackLearningActivity } from '../utils/gamification';

export const gameController = {
  getGamesByLevel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = req.params.levelId as string;
      const levelIdNum = parseInt(levelId);

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const hasPremiumAccess = user.plan === 'PREMIUM' || user.role === 'ADMIN';

      const level = await prisma.level.findUnique({
        where: { id: levelIdNum },
        select: { isFree: true },
      });

      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }

      if (!level.isFree && !hasPremiumAccess) {
        return errorResponse(res, 'Premium subscription required', 403);
      }

      const games = await prisma.game.findMany({
        where: { levelId: levelIdNum, isActive: true },
        orderBy: { orderIndex: 'asc' },
      });

      const userProgress = await prisma.userGameProgress.findMany({
        where: {
          userId: req.userId,
          game: { levelId: levelIdNum },
        },
      });

      const progressMap = new Map(userProgress.map((p) => [p.gameId, p]));

      const gamesWithProgress = games.map((game) => {
        const progress = progressMap.get(game.id);
        return {
          id: game.id,
          type: game.type,
          titleAr: game.titleAr,
          orderIndex: game.orderIndex,
          bestScore: progress?.score || 0,
          attempts: progress?.attempts || 0,
          completed: progress?.completed || false,
        };
      });

      return successResponse(res, gamesWithProgress);
    } catch (error) {
      console.error('Get games error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getGame: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const game = await prisma.game.findUnique({
        where: { id },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!game) {
        return errorResponse(res, 'Game not found', 404);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const hasPremiumAccess = user.plan === 'PREMIUM' || user.role === 'ADMIN';

      const level = await prisma.level.findUnique({
        where: { id: game.levelId },
        select: { isFree: true },
      });

      if (level && !level.isFree && !hasPremiumAccess) {
        return errorResponse(res, 'Premium subscription required', 403);
      }

      const gameAny = game as any;
      const questionsWithoutAnswers = gameAny.questions.map((q: any) => ({
        id: q.id,
        questionData: q.questionData,
        type: q.type,
        orderIndex: q.orderIndex,
      }));

      return successResponse(res, {
        id: game.id,
        levelId: game.levelId,
        type: game.type,
        titleAr: game.titleAr,
        questions: questionsWithoutAnswers,
      });
    } catch (error) {
      console.error('Get game error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  submitAnswers: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const { answers } = req.body as { answers: { questionId: string; answer: string }[] };

      const game = await prisma.game.findUnique({
        where: { id },
        include: {
          questions: true,
        },
      });

      if (!game) {
        return errorResponse(res, 'Game not found', 404);
      }

      let correctCount = 0;
      const gameAny = game as any;
      const questionMap = new Map(gameAny.questions.map((q: any) => [q.id, q]));

      answers.forEach((answer) => {
        const question = questionMap.get(answer.questionId) as any;
        if (question && question.correctAnswer.toLowerCase() === answer.answer.toLowerCase().trim()) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / gameAny.questions.length) * 100);
      const passed = score >= 70;

      const progress = await prisma.userGameProgress.upsert({
        where: {
          userId_gameId: {
            userId: req.userId!,
            gameId: id,
          },
        },
        update: {
          score: score,
          completed: passed,
          attempts: { increment: 1 },
          completedAt: passed ? new Date() : undefined as any,
        },
        create: {
          userId: req.userId!,
          gameId: id,
          score,
          completed: passed,
          attempts: 1,
          completedAt: passed ? new Date() : undefined,
        },
      });

      if (passed) {
        const gamesDone = await prisma.userGameProgress.count({
          where: {
            userId: req.userId,
            game: { levelId: game.levelId },
            completed: true,
          },
        });

        const completion = await prisma.userLevelCompletion.findUnique({
          where: {
            userId_levelId: {
              userId: req.userId!,
              levelId: game.levelId,
            },
          },
        });

        if (completion) {
          await prisma.userLevelCompletion.update({
            where: { id: completion.id },
            data: { gamesDone },
          });
        } else {
          await prisma.userLevelCompletion.create({
            data: {
              userId: req.userId!,
              levelId: game.levelId,
              gamesDone,
            },
          });
        }

        // Check if entire level is completed
        await checkLevelCompletion(req.userId!, game.levelId);

        // Track learning activity for gamification (streak, points, achievements)
        await trackLearningActivity(req.userId!, 'game');
      }

      attempts: progress.attempts,
      });
  } catch(error) {
    console.error('Submit answers error:', error);
    return errorResponse(res, 'Server error', 500);
  }
},

  getProgress: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const progress = await prisma.userGameProgress.findUnique({
        where: {
          userId_gameId: {
            userId: req.userId!,
            gameId: id,
          },
        },
      });

      return successResponse(res, progress || { score: 0, attempts: 0, completed: false });
    } catch (error) {
      console.error('Get progress error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

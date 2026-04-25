import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import { checkLevelCompletion } from '../utils/progress.utils';
import { trackLearningActivity } from '../utils/gamification';

export const levelController = {
  getLevels: async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { currentLevel: true, plan: true, role: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }


      const levels = await prisma.level.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        include: {
          _count: {
            select: {
              sentences: true,
              games: true,
            },
          },
        },
      });

      const levelsWithProgress = await Promise.all(
        levels.map(async (level) => {
          const completion = await prisma.userLevelCompletion.findUnique({
            where: {
              userId_levelId: {
                userId: req.userId!,
                levelId: level.id,
              },
            },
          });

          const sentenceProgress = await prisma.userSentenceProgress.count({
            where: {
              userId: req.userId,
              sentence: { levelId: level.id },
              completed: true,
            },
          });

          const totalSentences = await prisma.sentence.count({
            where: { levelId: level.id },
          });

          const isLocked = false;

          return {
            ...level,
            isLocked,
            progress: totalSentences > 0 ? Math.round((sentenceProgress / totalSentences) * 100) : 0,
            completed: completion?.completed || false,
          };
        })
      );

      return successResponse(res, levelsWithProgress);
    } catch (error) {
      console.error('Get levels error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getLevel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const levelId = parseInt(id);

      const level = await prisma.level.findUnique({
        where: { id: levelId },
        include: {
          _count: {
            select: {
              sentences: true,
              games: true,
            },
          },
        },
      });

      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, currentLevel: true, role: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const isLocked = false;

      return successResponse(res, { ...level, isLocked });
    } catch (error) {
      console.error('Get level error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getSentences: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const levelId = parseInt(id);
      const page = req.query.page as string;
      const limit = req.query.limit as string;
      const { limit: safeLimit, offset } = getPagination(page, limit);

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }


      const level = await prisma.level.findUnique({
        where: { id: levelId },
        select: { isFree: true, id: true },
      });

      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }

      const [sentences, total] = await Promise.all([
        prisma.sentence.findMany({
          where: { levelId, isActive: true },
          orderBy: { orderIndex: 'asc' },
          skip: offset,
          take: safeLimit,
        }),
        prisma.sentence.count({ where: { levelId, isActive: true } }),
      ]);

      const userProgress = await prisma.userSentenceProgress.findMany({
        where: {
          userId: req.userId,
          sentence: { levelId },
        },
      });

      const progressMap = new Map(userProgress.map((p) => [p.sentenceId, p]));

      const sentencesWithProgress = sentences.map((sentence) => {
        const progress = progressMap.get(sentence.id);
        return {
          ...sentence,
          listened: progress?.listened || false,
          completed: progress?.completed || false,
          listenCount: progress?.listenCount || 0,
        };
      });

      return successResponse(res, {
        sentences: sentencesWithProgress,
        pagination: {
          total,
          page: offset / safeLimit + 1,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit),
        },
      });
    } catch (error) {
      console.error('Get sentences error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  markListened: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { sentenceId } = req.params as { sentenceId: string };

      await prisma.userSentenceProgress.upsert({
        where: {
          userId_sentenceId: {
            userId: req.userId!,
            sentenceId,
          },
        },
        update: {
          listened: true,
          listenCount: { increment: 1 },
        },
        create: {
          userId: req.userId!,
          sentenceId,
          listened: true,
          listenCount: 1,
        },
      });

      return successResponse(res, null, 'Marked as listened');
    } catch (error) {
      console.error('Mark listened error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  markCompleted: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { sentenceId } = req.params as { sentenceId: string };

      const progress = await prisma.userSentenceProgress.upsert({
        where: {
          userId_sentenceId: {
            userId: req.userId!,
            sentenceId,
          },
        },
        update: {
          completed: true,
          completedAt: new Date(),
        },
        create: {
          userId: req.userId!,
          sentenceId,
          completed: true,
          completedAt: new Date(),
        },
      });

      const sentence = await prisma.sentence.findUnique({
        where: { id: sentenceId },
        select: { levelId: true },
      });

      if (sentence) {
        const completion = await prisma.userLevelCompletion.findUnique({
          where: {
            userId_levelId: {
              userId: req.userId!,
              levelId: sentence.levelId,
            },
          },
        });

        const sentencesDone = await prisma.userSentenceProgress.count({
          where: {
            userId: req.userId,
            sentence: { levelId: sentence.levelId },
            completed: true,
          },
        });

        if (completion) {
          await prisma.userLevelCompletion.update({
            where: { id: completion.id },
            data: { sentencesDone },
          });
        } else {
          await prisma.userLevelCompletion.create({
            data: {
              userId: req.userId!,
              levelId: sentence.levelId,
              sentencesDone,
            },
          });
        }

        // Check if entire level is completed
        await checkLevelCompletion(req.userId!, sentence.levelId);

        // Track learning activity for gamification (streak, points, achievements)
        await trackLearningActivity(req.userId!, 'sentence');
      }

      return successResponse(res, progress, 'Marked as completed');
    } catch (error) {
      console.error('Mark completed error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getProgress: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const levelId = parseInt(id);

      const completion = await prisma.userLevelCompletion.findUnique({
        where: {
          userId_levelId: {
            userId: req.userId!,
            levelId,
          },
        },
      });

      const totalSentences = await prisma.sentence.count({
        where: { levelId, isActive: true },
      });

      const totalGames = await prisma.game.count({
        where: { levelId, isActive: true },
      });

      const completedGames = await prisma.userGameProgress.count({
        where: {
          userId: req.userId,
          game: { levelId },
          completed: true,
        },
      });

      const quiz = await prisma.levelQuiz.findUnique({
        where: { levelId },
        include: {
          attempts: {
            where: { userId: req.userId },
            orderBy: { attemptedAt: 'desc' },
            take: 1,
          },
        },
      });

      return successResponse(res, {
        sentencesDone: completion?.sentencesDone || 0,
        totalSentences,
        gamesDone: completion?.gamesDone || completedGames || 0,
        totalGames,
        quizPassed: completion?.quizPassed || false,
        shadowingDone: completion?.shadowingDone || false,
        completed: completion?.completed || false,
        quizAttempts: quiz?.attempts || [],
      });
    } catch (error) {
      console.error('Get progress error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
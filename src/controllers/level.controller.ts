import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import { checkLevelCompletion } from '../utils/progress.utils';
import { trackLearningActivity } from '../utils/gamification';

function hasPremiumAccess(..._args: unknown[]): boolean {
  return true;
}

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
              grammarRules: true,
            },
          },
        },
      });

      const premiumOk = user ? hasPremiumAccess() : false;

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
            where: { levelId: level.id, isActive: true },
          });

          const isLocked =
            !level.isFree && !premiumOk;

          let progress = 0;
          if (level.levelType === 'grammar') {
            progress = completion?.completed ? 100 : 0;
          } else {
            progress = totalSentences > 0 ? Math.round((sentenceProgress / totalSentences) * 100) : completion?.completed ? 100 : 0;
          }

          return {
            ...level,
            isLocked,
            progress,
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
              grammarRules: true,
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

      const premiumOk = hasPremiumAccess();
      const isLocked = !level.isFree && !premiumOk;

      const nextLevel = await prisma.level.findFirst({
        where: {
          orderIndex: { gt: level.orderIndex },
          isActive: true,
        },
        orderBy: { orderIndex: 'asc' },
        select: { id: true },
      });

      return successResponse(res, {
        ...level,
        isLocked,
        nextLevelId: nextLevel?.id ?? null,
      });
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
        select: { isFree: true, id: true, levelType: true },
      });

      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }

      if (level.levelType === 'grammar') {
        return errorResponse(res, 'This level uses grammar rules, not sentences', 400, 'GRAMMAR_LEVEL');
      }

      if (!level.isFree && !hasPremiumAccess()) {
        return errorResponse(res, 'Premium required for this level', 403, 'PREMIUM_REQUIRED');
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

  getGrammarRules: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = parseInt(req.params.id as string, 10);
      const level = await prisma.level.findUnique({ where: { id: levelId } });
      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }
      if (level.levelType !== 'grammar') {
        return errorResponse(res, 'Not a grammar level', 400, 'NOT_GRAMMAR_LEVEL');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }
      if (!level.isFree && !hasPremiumAccess()) {
        return errorResponse(res, 'Premium required for this level', 403, 'PREMIUM_REQUIRED');
      }

      const rules = await prisma.grammarRule.findMany({
        where: { levelId, isActive: true },
        orderBy: { orderIndex: 'asc' },
      });

      return successResponse(res, { rules });
    } catch (error) {
      console.error('Get grammar rules error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getGrammarRuleById: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = parseInt(req.params.id as string, 10);
      const ruleId = req.params.ruleId as string;

      const level = await prisma.level.findUnique({ where: { id: levelId } });
      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }
      if (level.levelType !== 'grammar') {
        return errorResponse(res, 'Not a grammar level', 400, 'NOT_GRAMMAR_LEVEL');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }
      if (!level.isFree && !hasPremiumAccess()) {
        return errorResponse(res, 'Premium required for this level', 403, 'PREMIUM_REQUIRED');
      }

      const rule = await prisma.grammarRule.findFirst({
        where: { id: ruleId, levelId, isActive: true },
      });
      if (!rule) {
        return errorResponse(res, 'Grammar rule not found', 404);
      }

      return successResponse(res, { rule });
    } catch (error) {
      console.error('Get grammar rule error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  completeGrammarLevel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = parseInt(req.params.id as string, 10);
      const level = await prisma.level.findUnique({ where: { id: levelId } });
      if (!level) {
        return errorResponse(res, 'Level not found', 404);
      }
      if (level.levelType !== 'grammar') {
        return errorResponse(res, 'Not a grammar level', 400, 'NOT_GRAMMAR_LEVEL');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }
      if (!level.isFree && !hasPremiumAccess()) {
        return errorResponse(res, 'Premium required for this level', 403, 'PREMIUM_REQUIRED');
      }

      const prior = await prisma.userLevelCompletion.findUnique({
        where: { userId_levelId: { userId: req.userId!, levelId } },
      });
      const wasCompleted = Boolean(prior?.completed);

      const ok = await checkLevelCompletion(req.userId!, levelId);
      if (!ok) {
        return errorResponse(res, 'Unable to complete level requirements', 400, 'COMPLETION_BLOCKED');
      }

      if (!wasCompleted) {
        await trackLearningActivity(req.userId!, 'level', {
          levelId,
          levelTitle: level.titleAr,
        });
      }

      const completion = await prisma.userLevelCompletion.findUnique({
        where: { userId_levelId: { userId: req.userId!, levelId } },
      });

      return successResponse(res, { completed: true, completion });
    } catch (error) {
      console.error('Complete grammar level error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

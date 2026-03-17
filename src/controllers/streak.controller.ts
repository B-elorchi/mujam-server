import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const streakController = {
  getStreak: async (req: Request, res: Response): Promise<Response> => {
    try {
      let streak = await prisma.userStreak.findUnique({
        where: { userId: req.userId },
      });

      if (!streak) {
        streak = await prisma.userStreak.create({
          data: { userId: req.userId! },
        });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastStudy = streak.lastStudyDate;
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let currentStreak = streak.currentStreak;
      
      if (lastStudy) {
        const lastStudyDate = new Date(lastStudy);
        lastStudyDate.setHours(0, 0, 0, 0);
        
        if (lastStudyDate.getTime() < yesterday.getTime()) {
          if (streak.freezesLeft > 0) {
            await prisma.userStreak.update({
              where: { id: streak.id },
              data: { freezesLeft: { decrement: 1 } },
            });
          } else {
            currentStreak = 0;
            await prisma.userStreak.update({
              where: { id: streak.id },
              data: { currentStreak: 0 },
            });
          }
        }
      }

      const weeklyCalendar: { date: string; active: boolean }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const isActive = lastStudy && new Date(lastStudy).toISOString().split('T')[0] === dateStr;
        weeklyCalendar.push({ date: dateStr, active: isActive });
      }

      return successResponse(res, {
        currentStreak: currentStreak,
        longestStreak: streak.longestStreak,
        freezesLeft: streak.freezesLeft,
        totalStudyDays: streak.totalStudyDays,
        weeklyCalendar,
      });
    } catch (error) {
      console.error('Get streak error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  useFreeze: async (req: Request, res: Response): Promise<Response> => {
    try {
      const streak = await prisma.userStreak.findUnique({
        where: { userId: req.userId },
      });

      if (!streak || streak.freezesLeft <= 0) {
        return errorResponse(res, 'No freezes available', 400);
      }

      await prisma.userStreak.update({
        where: { id: streak.id },
        data: {
          freezesLeft: { decrement: 1 },
          lastStudyDate: new Date(),
        },
      });

      return successResponse(res, { freezesLeft: streak.freezesLeft - 1 }, 'Freeze used');
    } catch (error) {
      console.error('Use freeze error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getAchievements: async (req: Request, res: Response): Promise<Response> => {
    try {
      const allAchievements = await prisma.achievement.findMany();

      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId: req.userId },
        select: { achievementId: true },
      });

      const earnedIds = new Set(userAchievements.map((ua) => ua.achievementId));

      const achievements = allAchievements.map((achievement) => ({
        ...achievement,
        earned: earnedIds.has(achievement.id),
      }));

      return successResponse(res, achievements);
    } catch (error) {
      console.error('Get achievements error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  checkAndAwardAchievements: async (userId: string): Promise<void> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            sentenceProgress: { where: { completed: true } },
            gameProgress: { where: { completed: true } },
            aiSessions: true,
            achievements: true,
          },
        },
        streak: true,
        levelCompletion: true,
      },
    });

    if (!user) return;

    const achievements = await prisma.achievement.findMany();
    const earnedIds = new Set(
      (await prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } })).map(
        (ua) => ua.achievementId
      )
    );

    for (const achievement of achievements) {
      if (earnedIds.has(achievement.id)) continue;

      const condition = achievement.condition as Record<string, any>;
      let earned = false;

      if (condition.sentences && user._count.sentenceProgress >= condition.sentences) {
        earned = true;
      }
      if (condition.streak && user.streak?.currentStreak >= condition.streak) {
        earned = true;
      }
      if (condition.aiSessions && user._count.aiSessions >= condition.aiSessions) {
        earned = true;
      }
      if (condition.level && user.levelCompletion.some((lc) => lc.levelId === condition.level && lc.completed)) {
        earned = true;
      }
      if (condition.levels && user.levelCompletion.filter((lc) => lc.completed).length >= condition.levels) {
        earned = true;
      }

      if (earned) {
        await prisma.userAchievement.create({
          data: { userId, achievementId: achievement.id },
        });
      }
    }
  },
};
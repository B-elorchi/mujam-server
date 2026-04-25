import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getAchievementsForUser } from '../services/achievement.service';
import { getStreakData } from '../services/streak.service';

export const streakController = {
  getStreak: async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await getStreakData(req.userId!);
      const weeklyCalendar = (data.weekView || []).map((day: { date: string; studied: boolean }) => ({
        date: day.date,
        active: day.studied,
      }));

      return successResponse(res, {
        currentStreak: data.currentStreak,
        longestStreak: data.longestStreak,
        freezesLeft: data.freezesLeft,
        totalStudyDays: data.totalStudyDays,
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
      const achievements = await getAchievementsForUser(req.userId!);
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
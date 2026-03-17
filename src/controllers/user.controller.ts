import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { uploadFile } from '../config/s3';

export const userController = {
  getProfile: async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: (req as any).userId },
        include: {
          streak: true,
          subscription: true,
          _count: {
            select: {
              sentenceProgress: { where: { completed: true } },
              gameProgress: { where: { completed: true } },
              aiSessions: true,
              achievements: true,
            },
          },
        },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      return successResponse(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
        plan: user.plan,
        currentLevel: user.currentLevel,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        streak: user.streak,
        stats: {
          sentencesLearned: user._count.sentenceProgress,
          gamesPassed: user._count.gameProgress,
          aiSessions: user._count.aiSessions,
          achievements: user._count.achievements,
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateProfile: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { name, avatarUrl } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: (req as any).userId },
        data: {
          ...(name && { name }),
          ...(avatarUrl && { avatarUrl }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          currentLevel: true,
          plan: true,
        },
      });

      return successResponse(res, updatedUser, 'Profile updated');
    } catch (error) {
      console.error('Update profile error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  uploadAvatar: async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.file) {
        return errorResponse(res, 'No file uploaded', 400);
      }

      const { url } = await uploadFile(req.file.buffer, 'avatars', req.file.mimetype);

      const user = await prisma.user.update({
        where: { id: (req as any).userId },
        data: { avatarUrl: url },
        select: { avatarUrl: true },
      });

      return successResponse(res, user, 'Avatar uploaded');
    } catch (error) {
      console.error('Upload avatar error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  deleteAccount: async (req: Request, res: Response): Promise<Response> => {
    try {
      await prisma.$transaction([
        prisma.refreshToken.updateMany({
          where: { userId: (req as any).userId },
          data: { isRevoked: true },
        }),
        prisma.user.update({
          where: { id: (req as any).userId },
          data: { isActive: false, email: `deleted_${Date.now()}@mujam.com` },
        }),
      ]);

      return successResponse(res, null, 'Account deleted');
    } catch (error) {
      console.error('Delete account error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getStats: async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: (req as any).userId },
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
        },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const totalStudyTime = await prisma.aISession.aggregate({
        where: { userId: (req as any).userId },
        _sum: { durationSeconds: true },
      });

      const averageAccuracyArr = await prisma.userShadowingProgress.aggregate({
        where: {
          userId: (req as any).userId,
          accuracyScore: { not: null }
        },
        _avg: { accuracyScore: true },
      });

      return successResponse(res, {
        sentencesLearned: user._count.sentenceProgress,
        gamesPassed: user._count.gameProgress,
        aiSessions: user._count.aiSessions,
        achievements: user._count.achievements,
        currentStreak: user.streak?.currentStreak || 0,
        longestStreak: user.streak?.longestStreak || 0,
        totalStudyTime: totalStudyTime._sum.durationSeconds || 0,
        averageAccuracy: Math.round(averageAccuracyArr._avg.accuracyScore || 0),
        currentLevel: user.currentLevel,
      });
    } catch (error) {
      console.error('Get stats error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getActivity: async (req: Request, res: Response): Promise<Response> => {
    try {
      const daysToFetch = 84; // 12 weeks
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToFetch);

      const sentenceActivity = await prisma.userSentenceProgress.groupBy({
        by: ['completedAt'],
        where: {
          userId: (req as any).userId,
          completed: true,
          completedAt: { gte: startDate },
        },
        _count: true,
      });

      const gameActivity = await prisma.userGameProgress.groupBy({
        by: ['completedAt'],
        where: {
          userId: (req as any).userId,
          completed: true,
          completedAt: { gte: startDate },
        },
        _count: true,
      });

      const activityByDay: Record<string, number> = {};

      for (let i = 0; i < daysToFetch; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        activityByDay[key] = 0;
      }

      sentenceActivity.forEach((item: { completedAt: Date | null; _count: number }) => {
        if (item.completedAt) {
          const key = item.completedAt.toISOString().split('T')[0];
          if (activityByDay[key] !== undefined) {
            activityByDay[key] += item._count;
          }
        }
      });

      gameActivity.forEach((item: { completedAt: Date | null; _count: number }) => {
        if (item.completedAt) {
          const key = item.completedAt.toISOString().split('T')[0];
          if (activityByDay[key] !== undefined) {
            activityByDay[key] += item._count;
          }
        }
      });

      const result = Object.entries(activityByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return successResponse(res, result);
    } catch (error) {
      console.error('Get activity error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
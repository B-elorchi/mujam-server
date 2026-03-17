import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const leaderboardController = {
  getLeaderboard: async (req: Request, res: Response): Promise<Response> => {
    try {
      const period = (req.query.period as string) || 'weekly';
      
      let periodKey: string;
      const now = new Date();
      
      if (period === 'weekly') {
        const weekNum = Math.ceil((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
        periodKey = `${now.getFullYear()}-W${weekNum}`;
      } else if (period === 'monthly') {
        periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      } else {
        periodKey = 'all-time';
      }

      const userPoints = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          currentLevel: true,
          _count: {
            select: {
              sentenceProgress: { where: { completed: true } },
              gameProgress: { where: { completed: true } },
              aiSessions: true,
            },
          },
          streak: { select: { currentStreak: true } },
        },
      });

      const calculatedPoints = userPoints.map((user) => {
        const sentences = user._count.sentenceProgress * 2;
        const games = user._count.gameProgress * 5;
        const ai = user._count.aiSessions * 10;
        const streak = (user.streak?.currentStreak || 0) * 3;
        return {
          userId: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          currentLevel: user.currentLevel,
          points: sentences + games + ai + streak,
        };
      });

      calculatedPoints.sort((a, b) => b.points - a.points);

      const leaderboard = calculatedPoints.slice(0, 50).map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

      const userRank = leaderboard.findIndex((e) => e.userId === req.userId);

      return successResponse(res, {
        period,
        leaderboard,
        userRank: userRank >= 0 ? userRank + 1 : null,
        userPoints: userRank >= 0 ? leaderboard[userRank].points : 0,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
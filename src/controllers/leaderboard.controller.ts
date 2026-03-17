import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const leaderboardController = {
  getLeaderboard: async (req: Request, res: Response): Promise<Response> => {
    try {
      const period = (req.query.period as string) || 'weekly';

      const now = new Date();
      let startDate: Date | undefined;

      if (period === 'weekly') {
        // Start of current week (Sunday)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'monthly') {
        // Start of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
      }

      // For all-time, use the stored points field
      // For weekly/monthly, calculate from activity in that period
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          role: 'STUDENT'
        },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          currentLevel: true,
          sentenceProgress: {
            where: {
              completed: true,
              ...(startDate ? { completedAt: { gte: startDate } } : {})
            },
            select: { id: true }
          },
          gameProgress: {
            where: {
              completed: true,
              ...(startDate ? { completedAt: { gte: startDate } } : {})
            },
            select: { id: true }
          },
          aiSessions: {
            where: {
              ...(startDate ? { startedAt: { gte: startDate } } : {})
            },
            select: { id: true }
          },
          streak: { select: { currentStreak: true } },
        },
      });

      const calculatedPoints = users.map((user) => {
        const sentences = (user.sentenceProgress?.length || 0) * 2;
        const games = (user.gameProgress?.length || 0) * 5;
        const ai = (user.aiSessions?.length || 0) * 10;
        const streak = ((user.streak?.currentStreak || 0) * 3);
        const points = sentences + games + ai + streak;

        return {
          userId: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          currentLevel: user.currentLevel,
          points: points,
        };
      });

      calculatedPoints.sort((a, b) => b.points - a.points);

      // Filter out users with 0 points if not all-time
      const filteredResults = period === 'all-time'
        ? calculatedPoints
        : calculatedPoints.filter(u => u.points > 0);

      const leaderboard = filteredResults.slice(0, 50).map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

      const userRankIndex = leaderboard.findIndex((e) => e.userId === req.userId);
      const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;

      // If user is not in top 50, find their actual rank in the full list
      let actualUserRank = userRank;
      let actualUserPoints = userRankIndex >= 0 ? leaderboard[userRankIndex].points : 0;

      if (!userRank) {
        const userInFullList = filteredResults.findIndex(u => u.userId === req.userId);
        if (userInFullList >= 0) {
          actualUserRank = userInFullList + 1;
          actualUserPoints = filteredResults[userInFullList].points;
        }
      }

      return successResponse(res, {
        period,
        leaderboard,
        userRank: actualUserRank,
        userPoints: actualUserPoints,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
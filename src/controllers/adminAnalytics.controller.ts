import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getEngagementAnalytics } from '../services/sessionTracking.service';

export const adminAnalyticsController = {
  getEngagement: async (req: Request, res: Response): Promise<Response> => {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const data = await getEngagementAnalytics(days);
      return successResponse(res, data);
    } catch (error) {
      console.error('Get engagement analytics error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getOverview: async (req: Request, res: Response): Promise<Response> => {
    try {
      const totalUsers = await prisma.user.count();
      const activeUsers = await prisma.user.count({ where: { isActive: true } });
      const premiumUsers = await prisma.user.count({ where: { plan: 'PREMIUM' } });
      const freeUsers = await prisma.user.count({ where: { plan: 'FREE' } });

      const subscriptions = await prisma.subscription.findMany({ where: { isActive: true } });
      const mrr = subscriptions.reduce((sum, sub) => sum + sub.priceMonthly, 0);

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthUsers = await prisma.user.count({ where: { createdAt: { lt: lastMonth } } });
      const newUsersThisMonth = totalUsers - lastMonthUsers;
      const conversionRate = lastMonthUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0';

      const cancelledLastMonth = await prisma.subscription.count({
        where: { cancelledAt: { gte: lastMonth } },
      });
      const churnRate = subscriptions.length > 0 ? ((cancelledLastMonth / subscriptions.length) * 100).toFixed(1) : '0';

      return successResponse(res, {
        totalUsers,
        activeUsers,
        premiumUsers,
        freeUsers,
        mrr: mrr.toFixed(2),
        newUsersThisMonth,
        conversionRate,
        churnRate,
      });
    } catch (error) {
      console.error('Get overview error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getGrowth: async (req: Request, res: Response): Promise<Response> => {
    try {
      const months = parseInt(req.query.months as string) || 6;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const users = await prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: { createdAt: true },
      });

      const byMonth: Record<string, number> = {};
      users.forEach((user) => {
        const month = user.createdAt.toISOString().substring(0, 7);
        byMonth[month] = (byMonth[month] || 0) + 1;
      });

      const result = Object.entries(byMonth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return successResponse(res, result);
    } catch (error) {
      console.error('Get growth error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getRevenue: async (req: Request, res: Response): Promise<Response> => {
    try {
      const months = parseInt(req.query.months as string) || 12;
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const subscriptions = await prisma.subscription.findMany({
        where: { createdAt: { gte: startDate } },
        select: { startDate: true, priceMonthly: true },
      });

      const byMonth: Record<string, number> = {};
      subscriptions.forEach((sub) => {
        const month = sub.startDate.toISOString().substring(0, 7);
        byMonth[month] = (byMonth[month] || 0) + sub.priceMonthly;
      });

      const result = Object.entries(byMonth)
        .map(([month, revenue]) => ({ month, revenue: revenue.toFixed(2) }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return successResponse(res, result);
    } catch (error) {
      console.error('Get revenue error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getFunnel: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levels = await prisma.level.findMany({ orderBy: { id: 'asc' } });

      const funnel = await Promise.all(
        levels.map(async (level) => {
          const started = await prisma.userLevelCompletion.count({ where: { levelId: level.id } });
          const sentencesDone = await prisma.userSentenceProgress.count({
            where: { sentence: { levelId: level.id }, completed: true },
          });
          const gamesDone = await prisma.userGameProgress.count({
            where: { game: { levelId: level.id }, completed: true },
          });
          const quizPassed = await prisma.userLevelCompletion.count({
            where: { levelId: level.id, quizPassed: true },
          });
          const completed = await prisma.userLevelCompletion.count({
            where: { levelId: level.id, completed: true },
          });

          return {
            level: level.id,
            titleAr: level.titleAr,
            started,
            sentencesDone,
            gamesDone,
            quizPassed,
            completed,
            completionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
          };
        })
      );

      return successResponse(res, funnel);
    } catch (error) {
      console.error('Get funnel error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getActivityHeatmap: async (req: Request, res: Response): Promise<Response> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const activities = await prisma.user.findMany({
        where: { lastActiveAt: { gte: startDate } },
        select: { lastActiveAt: true },
      });

      const heatmap: Record<string, Record<number, number>> = {};
      
      for (let d = 0; d < 7; d++) {
        heatmap[d] = {};
        for (let h = 0; h < 24; h++) {
          heatmap[d][h] = 0;
        }
      }

      activities.forEach((user) => {
        if (user.lastActiveAt) {
          const day = user.lastActiveAt.getDay();
          const hour = user.lastActiveAt.getHours();
          heatmap[day][hour]++;
        }
      });

      return successResponse(res, heatmap);
    } catch (error) {
      console.error('Get activity heatmap error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getContent: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levels = await prisma.level.findMany({ include: { _count: { select: { sentences: true, games: true } } } });

      const contentStats = await Promise.all(
        levels.map(async (level) => {
          const completedUsers = await prisma.userLevelCompletion.count({
            where: { levelId: level.id, completed: true },
          });
          return {
            level: level.id,
            titleAr: level.titleAr,
            sentences: level._count.sentences,
            games: level._count.games,
            completionCount: completedUsers,
          };
        })
      );

      const mostCompleted = [...contentStats].sort((a, b) => b.completionCount - a.completionCount)[0];
      const leastCompleted = [...contentStats].sort((a, b) => a.completionCount - b.completionCount)[0];

      return successResponse(res, {
        byLevel: contentStats,
        mostCompleted: mostCompleted?.titleAr || 'N/A',
        leastCompleted: leastCompleted?.titleAr || 'N/A',
      });
    } catch (error) {
      console.error('Get content error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getAICost: async (req: Request, res: Response): Promise<Response> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const usage = await prisma.aIUsageLog.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'asc' },
      });

      const byDay: Record<string, number> = {};
      usage.forEach((log) => {
        const day = log.createdAt.toISOString().split('T')[0];
        byDay[day] = (byDay[day] || 0) + log.costUsd;
      });

      const result = Object.entries(byDay)
        .map(([date, cost]) => ({ date, cost: cost.toFixed(4) }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return successResponse(res, result);
    } catch (error) {
      console.error('Get AI cost error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
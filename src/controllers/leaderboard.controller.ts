import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getLeaderboardForPeriod } from '../services/leaderboard.service';

export const leaderboardController = {
  getLeaderboard: async (req: Request, res: Response): Promise<Response> => {
    try {
      const raw = (req.query.period as string) || 'weekly';
      if (!['weekly', 'monthly', 'all-time'].includes(raw)) {
        return errorResponse(res, 'Invalid period', 400);
      }
      const period = raw as 'weekly' | 'monthly' | 'all-time';

      const full = await getLeaderboardForPeriod(period);
      const leaderboard = full.slice(0, 50);

      const me = req.userId ? full.find((e) => e.userId === req.userId) : undefined;
      const userRank = me?.rank ?? null;
      const userPoints = me?.points ?? 0;

      return successResponse(res, {
        period,
        leaderboard,
        userRank,
        userPoints,
      });
    } catch (error) {
      console.error('Get leaderboard error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/apiResponse';
import {
  getOrCreateDailyPath,
  markDailyPathStep,
  getWeeklyChallengeStatus,
  updateWeeklyChallengeProgress,
  DailyPathStepKey,
} from '../services/engagement.service';
import { touchSession } from '../services/sessionTracking.service';

const VALID_STEPS = new Set<DailyPathStepKey>(['sentences', 'game', 'shadowing', 'ai']);

export const engagementController = {
  /** Client polls every few minutes while the app is open. */
  heartbeat: async (req: Request, res: Response): Promise<Response> => {
    try {
      const session = await touchSession(req.userId!);
      return successResponse(res, {
        sessionId: session.id,
        startedAt: session.startedAt,
        lastSeenAt: session.lastSeenAt,
      });
    } catch (error) {
      console.error('Heartbeat error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getDailyPath: async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await getOrCreateDailyPath(req.userId!);
      return successResponse(res, data);
    } catch (error) {
      console.error('Get daily path error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  markDailyPathStep: async (req: Request, res: Response): Promise<Response> => {
    try {
      const step = req.body?.step as DailyPathStepKey;
      if (!VALID_STEPS.has(step)) {
        return errorResponse(res, 'Invalid step. Use sentences|game|shadowing|ai', 400);
      }
      const data = await markDailyPathStep(req.userId!, step);
      return successResponse(res, data, 'Step updated');
    } catch (error) {
      console.error('Mark daily path step error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getWeeklyChallenge: async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = await getWeeklyChallengeStatus(req.userId!);
      return successResponse(res, data);
    } catch (error) {
      console.error('Get weekly challenge error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateWeeklyChallenge: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { attempted, completed, score } = req.body || {};
      if (
        attempted === undefined &&
        completed === undefined &&
        score === undefined
      ) {
        return errorResponse(res, 'Provide attempted, completed, and/or score', 400);
      }
      const data = await updateWeeklyChallengeProgress(req.userId!, {
        attempted: typeof attempted === 'boolean' ? attempted : undefined,
        completed: typeof completed === 'boolean' ? completed : undefined,
        score: typeof score === 'number' ? score : score === null ? null : undefined,
      });
      return successResponse(res, data, 'Challenge progress updated');
    } catch (error) {
      console.error('Update weekly challenge error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

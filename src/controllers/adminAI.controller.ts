import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { gpt } from '../config/openai';
import { serviceDisplayLabel, serviceTypeLabel, aggregateUsageBreakdown, isKidsTtsFeature, KIDS_TTS_FEATURE, KIDS_TTS_BULK_FEATURE } from '../services/ai/usage.service';
import { fetchOpenRouterKeyUsage } from '../services/ai/openrouter-usage.service';

export const adminAIController = {
  getAISettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      let settings = await prisma.aISettings.findFirst();

      if (!settings) {
        settings = await prisma.aISettings.create({
          data: {
            id: 'singleton',
            systemPrompt: 'You are an English language tutor.',
          },
        });
      }

      return successResponse(res, settings);
    } catch (error) {
      console.error('Get AI settings error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateAISettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { gptModel, sttModel, ttsModel, ttsVoice, temperature, systemPrompt, correctionStyle, formalityLevel, monthlyBudgetUsd } = req.body;

      const settings = await prisma.aISettings.upsert({
        where: { id: 'singleton' },
        update: {
          ...(gptModel && { gptModel }),
          ...(sttModel && { sttModel }),
          ...(ttsModel && { ttsModel }),
          ...(ttsVoice && { ttsVoice }),
          ...(temperature !== undefined && { temperature }),
          ...(systemPrompt && { systemPrompt }),
          ...(correctionStyle && { correctionStyle }),
          ...(formalityLevel && { formalityLevel: parseInt(formalityLevel) }),
          ...(monthlyBudgetUsd && { monthlyBudgetUsd: parseFloat(monthlyBudgetUsd) }),
        },
        create: {
          id: 'singleton',
          gptModel: gptModel || 'gpt-4o-mini',
          sttModel: sttModel || 'whisper-1',
          ttsModel: ttsModel || 'tts-1',
          ttsVoice: ttsVoice || 'nova',
          temperature: temperature || 0.7,
          systemPrompt: systemPrompt || 'You are an English language tutor.',
          correctionStyle: correctionStyle || 'balanced',
          formalityLevel: formalityLevel || 60,
          monthlyBudgetUsd: monthlyBudgetUsd || 50,
        },
      });

      return successResponse(res, settings, 'AI settings updated');
    } catch (error) {
      console.error('Update AI settings error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  testAISettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { message } = req.body;
      const userId = (req as any).userId as string | undefined;

      const settings = await prisma.aISettings.findFirst();

      const { content } = await gpt(
        [{ role: 'system', content: settings?.systemPrompt || 'You are an English tutor.' }, { role: 'user', content: message }],
        settings?.gptModel || 'gpt-4o-mini',
        settings?.temperature || 0.7,
        userId
      );

      return successResponse(res, { response: content });
    } catch (error) {
      console.error('Test AI settings error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getScenarios: async (req: Request, res: Response): Promise<Response> => {
    try {
      const scenarios = await prisma.aIScenario.findMany({
        include: { level: { select: { id: true, titleAr: true } } },
        orderBy: { levelId: 'asc' },
      });

      return successResponse(res, scenarios);
    } catch (error) {
      console.error('Get scenarios error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createScenario: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { levelId, nameAr, descriptionAr, systemPrompt, openingMessage, icon } = req.body;

      const scenario = await prisma.aIScenario.create({
        data: {
          levelId: parseInt(levelId),
          nameAr,
          descriptionAr,
          systemPrompt,
          openingMessage,
          icon,
        },
      });

      return successResponse(res, scenario, 'Scenario created');
    } catch (error) {
      console.error('Create scenario error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateScenario: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { nameAr, descriptionAr, systemPrompt, openingMessage, icon, isActive } = req.body;

      const scenario = await prisma.aIScenario.update({
        where: { id },
        data: {
          ...(nameAr && { nameAr }),
          ...(descriptionAr && { descriptionAr }),
          ...(systemPrompt && { systemPrompt }),
          ...(openingMessage && { openingMessage }),
          ...(icon && { icon }),
          ...(isActive !== undefined && { isActive }),
        },
      });

      return successResponse(res, scenario, 'Scenario updated');
    } catch (error) {
      console.error('Update scenario error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  deleteScenario: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      await prisma.aIScenario.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(res, null, 'Scenario deactivated');
    } catch (error) {
      console.error('Delete scenario error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getAIUsage: async (req: Request, res: Response): Promise<Response> => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const featureFilter = typeof req.query.feature === 'string' ? req.query.feature : undefined;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const usageWhere: {
        createdAt: { gte: Date }
        feature?: string | { in: string[] }
      } = {
        createdAt: { gte: startDate },
      };
      if (featureFilter && featureFilter !== 'all') {
        if (featureFilter === 'kids_tts') {
          usageWhere.feature = {
            in: [KIDS_TTS_FEATURE, 'tts_kids_en', 'tts_kids_ar'],
          };
        } else {
          usageWhere.feature = featureFilter;
        }
      }

      const [usage, recentRows, monthlyAgg, settings, openRouterLive] = await Promise.all([
        prisma.aIUsageLog.findMany({
          where: usageWhere,
          orderBy: { createdAt: 'asc' },
        }),
        prisma.aIUsageLog.findMany({
          where: usageWhere,
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { user: { select: { id: true, name: true } } },
        }),
        prisma.aIUsageLog.aggregate({
          where: { createdAt: { gte: monthStart } },
          _sum: { costUsd: true },
          _count: true,
        }),
        prisma.aISettings.findFirst(),
        fetchOpenRouterKeyUsage(),
      ]);

      const byService = usage.reduce((acc, log) => {
        acc[log.service] = (acc[log.service] || 0) + log.costUsd;
        return acc;
      }, {} as Record<string, number>);

      const byFeature = usage.reduce((acc, log) => {
        const key = log.feature || serviceTypeLabel(log.service, log.feature);
        acc[key] = (acc[key] || 0) + log.costUsd;
        return acc;
      }, {} as Record<string, number>);

      const byProvider = aggregateUsageBreakdown(usage, 'provider');
      const byKeyLabel = aggregateUsageBreakdown(usage, 'keyLabel');
      const byModel = aggregateUsageBreakdown(usage, 'model');
      const byFeatureRows = aggregateUsageBreakdown(usage, 'feature');

      const byDay = usage.reduce((acc, log) => {
        const day = log.createdAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + log.costUsd;
        return acc;
      }, {} as Record<string, number>);

      const totalCost = Object.values(byService).reduce((a, b) => a + b, 0);
      const totalMessages = usage.filter((log) => log.service === 'gpt').length;
      const totalSttMinutes = usage
        .filter((log) => log.service === 'deepgram')
        .reduce((sum, log) => sum + (log.durationMin || 0), 0);
      const totalTtsChars = usage
        .filter((log) => log.service === 'deepgram-tts' || log.service === 'openrouter-tts')
        .reduce((sum, log) => sum + (log.characters || 0), 0);
      const kidsTtsLogs = usage.filter((log) => isKidsTtsFeature(log.feature));
      const kidsTtsChars = kidsTtsLogs.reduce((sum, log) => sum + (log.characters || 0), 0);
      const kidsTtsCost = kidsTtsLogs.reduce((sum, log) => sum + log.costUsd, 0);
      const kidsTtsBulkCost = usage
        .filter((log) => log.feature === KIDS_TTS_BULK_FEATURE)
        .reduce((sum, log) => sum + log.costUsd, 0);
      const kidsTtsOnDemandCost = usage
        .filter((log) => log.feature === KIDS_TTS_FEATURE)
        .reduce((sum, log) => sum + log.costUsd, 0);

      const topUsers = await prisma.aIUsageLog.groupBy({
        by: ['userId'],
        where: usageWhere,
        _sum: { costUsd: true },
        orderBy: { _sum: { costUsd: 'desc' } },
        take: 10,
      });

      const userIds = topUsers.map((u) => u.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u.name]));

      const topUsersWithNames = topUsers.map((u) => ({
        userId: u.userId,
        name: userMap.get(u.userId) || 'Unknown',
        totalCost: u._sum.costUsd || 0,
      }));

      const budget = settings?.monthlyBudgetUsd || 50;
      const monthlyUsed = monthlyAgg._sum.costUsd || 0;

      const recentLogs = recentRows.map((log) => ({
        id: log.id,
        service: log.service,
        feature: log.feature,
        provider: log.provider,
        keyLabel: log.keyLabel,
        model: log.model || serviceDisplayLabel(log.service, log.feature),
        type: serviceTypeLabel(log.service, log.feature),
        tokens: log.tokens,
        characters: log.characters,
        outputBytes: log.outputBytes,
        durationMin: log.durationMin,
        costUsd: log.costUsd,
        createdAt: log.createdAt,
        userName: log.user?.name || 'Unknown',
      }));

      return successResponse(res, {
        totalCost,
        totalMessages,
        totalSttMinutes,
        totalTtsChars,
        kidsTtsChars,
        kidsTtsCost,
        kidsTtsBulkCost,
        kidsTtsOnDemandCost,
        byService,
        byFeature,
        byProvider,
        byKeyLabel,
        byModel,
        byFeatureRows,
        byDay,
        topUsers: topUsersWithNames,
        recentLogs,
        periodDays: days,
        featureFilter: featureFilter || 'all',
        external: {
          openRouter: openRouterLive,
        },
        monthly: {
          used: monthlyUsed,
          budget,
          percentage: budget > 0 ? Math.round((monthlyUsed / budget) * 100) : 0,
        },
      });
    } catch (error) {
      console.error('Get AI usage error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getMonthlyTotal: async (req: Request, res: Response): Promise<Response> => {
    try {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const usage = await prisma.aIUsageLog.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { costUsd: true },
      });

      const settings = await prisma.aISettings.findFirst();
      const budget = settings?.monthlyBudgetUsd || 50;

      return successResponse(res, {
        used: usage._sum.costUsd || 0,
        budget,
        percentage: Math.round(((usage._sum.costUsd || 0) / budget) * 100),
      });
    } catch (error) {
      console.error('Get monthly total error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

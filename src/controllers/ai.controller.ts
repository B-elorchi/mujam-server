import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import {
  transcribeAudio,
  streamChat,
  textToSpeech,
  buildSystemPrompt,
  scorePronunciation,
  parseAIResponse,
  analyzeSession,
  evaluateDifficulty,
} from '../services/ai';
import { trackLearningActivity } from '../utils/gamification';

export const aiController = {
  getScenarios: async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { currentLevel: true, plan: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const scenarios = await prisma.aIScenario.findMany({
        where: { levelId: { lte: user.currentLevel }, isActive: true },
        orderBy: { usageCount: 'asc' },
      });

      return successResponse(res, scenarios);
    } catch (error) {
      console.error('Get scenarios error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  startSession: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { scenarioId, mode } = req.body;

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, currentLevel: true, plan: true, role: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      // Plan guard check for free users
      let sessionLimit = 3;
      if (user.plan === 'PREMIUM' || user.role === 'ADMIN') {
        sessionLimit = 999999;
      }

      const monthStart = new Date();
      monthStart.setDate(1);
      const sessionsThisMonth = await prisma.aISession.count({
        where: {
          userId: req.userId,
          startedAt: { gte: monthStart },
        },
      });

      if (sessionsThisMonth >= sessionLimit) {
        return errorResponse(res, 'Monthly AI session limit reached. Upgrade to Premium for unlimited sessions.', 403);
      }

      const settings = await prisma.aISettings.findFirst();
      if (!settings) throw new Error('AI settings not found');

      let scenario = null;
      if (scenarioId) {
        scenario = await prisma.aIScenario.findUnique({ where: { id: scenarioId } });
        if (scenario) {
          await prisma.aIScenario.update({
            where: { id: scenarioId },
            data: { usageCount: { increment: 1 } },
          });
        }
      }

      const systemPrompt = buildSystemPrompt(
        user.currentLevel,
        mode || 'GUIDED',
        scenario?.nameAr || null,
        settings
      );

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...(scenario ? [{ role: 'assistant' as const, content: scenario.openingMessage }] : []),
      ];

      const session = await prisma.aISession.create({
        data: {
          userId: req.userId!,
          scenarioId: scenarioId || null,
          mode: mode || 'GUIDED',
          userLevel: user.currentLevel,
          messages: messages as any,
        },
      });

      return successResponse(res, {
        sessionId: session.id,
        messages: scenario ? [{ role: 'assistant', content: scenario.openingMessage }] : [],
      });
    } catch (error) {
      console.error('Start session error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  sendMessage: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { expectedText } = req.body;

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const session = await prisma.aISession.findUnique({
        where: { id: id as string },
        include: { scenario: true },
      });

      if (!session) {
        sendEvent('error', { message: 'Session not found' });
        res.end();
        return;
      }

      let userText = req.body.text;
      let durationSeconds = 0;

      // Detect language from scenario (scenarios are in Arabic, so use 'ar')
      // If no scenario, default to Arabic for AI conversations
      const language = 'ar';

      // 1. Transcribe audio if provided
      if (req.file) {
        sendEvent('status', { step: 'transcribing' });
        const sttResult = await transcribeAudio((req as any).userId!, req.file.buffer, req.file.mimetype, language);
        userText = sttResult.transcript;
        durationSeconds = sttResult.duration;
        sendEvent('transcript', { text: userText });
      }

      if (!userText) {
        sendEvent('error', { message: 'No text or audio provided' });
        res.end();
        return;
      }

      // 2. Pronunciation scoring if expected text provided
      if (expectedText) {
        const pronScore = scorePronunciation(expectedText, userText);
        sendEvent('pronunciation', pronScore);
      }

      // 3. Prepare chat
      const settings = (await prisma.aISettings.findFirst())!;
      const messages = (session.messages as any[]) || [];
      messages.push({ role: 'user', content: userText });

      let fullAIResponse = '';

      sendEvent('status', { step: 'thinking' });

      await streamChat({
        userId: (req as any).userId!,
        messages,
        settings,
        onToken: (token) => sendEvent('token', { token }),
        onComplete: (text) => { fullAIResponse = text; }
      });

      // 4. Parse response for corrections
      const { cleanText, corrections, vocab } = await parseAIResponse(fullAIResponse);
      if (corrections.length > 0) sendEvent('corrections', { corrections });
      if (vocab.length > 0) sendEvent('vocab', { vocab });

      // 5. TTS (optional - gracefully handle failures)
      try {
        sendEvent('status', { step: 'generating_audio' });
        const audioBuffer = await textToSpeech(cleanText, 'normal', (req as any).userId);
        sendEvent('audio', { audioBase64: audioBuffer.toString('base64'), mimeType: 'audio/mpeg' });
      } catch (ttsError: any) {
        console.warn('TTS failed, continuing without audio:', ttsError.message);
        // Send text-only response if TTS fails
        sendEvent('text', { text: cleanText });
      }

      // 6. Update session
      messages.push({ role: 'assistant', content: fullAIResponse });
      await prisma.aISession.update({
        where: { id: id as string },
        data: {
          messages: messages as any,
          durationSeconds: { increment: Math.round(durationSeconds) },
        },
      });

      sendEvent('done', { success: true });
      res.end();
    } catch (error: any) {
      console.error('Send message error:', error);
      // Log more details for debugging
      console.error('Error Details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      sendEvent('error', { message: 'حدث خطأ غير متوقع: ' + (error.message || '') });
      res.end();
    }
  },

  endSession: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const summary = await analyzeSession(id as string, (req as any).userId!);

      // Track learning activity for gamification
      await trackLearningActivity((req as any).userId!, 'ai_session');

      return successResponse(res, summary, 'Session ended and analyzed');
    } catch (error) {
      console.error('End session error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getSessions: async (req: Request, res: Response): Promise<Response> => {
    try {
      const sessions = await prisma.aISession.findMany({
        where: { userId: req.userId },
        orderBy: { startedAt: 'desc' },
        take: 20,
      });
      return successResponse(res, sessions);
    } catch (error) {
      console.error('Get sessions error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getSession: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const session = await prisma.aISession.findUnique({
        where: { id: id as string },
        include: { scenario: true },
      });
      if (!session) return errorResponse(res, 'Session not found', 404);
      return successResponse(res, session);
    } catch (error) {
      console.error('Get session error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getDifficultyRecommendation: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.userId;
      if (!userId) return errorResponse(res, 'User not found', 404);

      const metrics = await evaluateDifficulty(userId);
      return successResponse(res, metrics);
    } catch (error) {
      console.error('Difficulty evaluation error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  // Admin Methods
  getAdminScenarios: async (req: Request, res: Response): Promise<Response> => {
    try {
      const scenarios = await prisma.aIScenario.findMany({
        orderBy: [{ levelId: 'asc' }, { nameAr: 'asc' }],
        include: { level: true }
      });
      return successResponse(res, scenarios);
    } catch (error) {
      console.error('Error in getAdminScenarios:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  },

  createScenario: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { nameAr, descriptionAr, systemPrompt, openingMessage, levelId, icon, isActive } = req.body;

      const scenario = await prisma.aIScenario.create({
        data: {
          nameAr,
          descriptionAr,
          systemPrompt,
          openingMessage,
          levelId: parseInt(levelId),
          icon,
          isActive: isActive !== undefined ? isActive : true,
        }
      });

      return successResponse(res, scenario, 'Scenario created successfully');
    } catch (error) {
      console.error('Error in createScenario:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  },

  updateScenario: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      const { nameAr, descriptionAr, systemPrompt, openingMessage, levelId, icon, isActive } = req.body;

      const scenario = await prisma.aIScenario.update({
        where: { id },
        data: {
          nameAr,
          descriptionAr,
          systemPrompt,
          openingMessage,
          levelId: levelId ? parseInt(levelId) : undefined,
          icon,
          isActive,
        }
      });

      return successResponse(res, scenario, 'Scenario updated successfully');
    } catch (error) {
      console.error('Error in updateScenario:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  },

  deleteScenario: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;
      await prisma.aIScenario.delete({ where: { id } });
      return successResponse(res, null, 'Scenario deleted successfully');
    } catch (error) {
      console.error('Error in deleteScenario:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  },

  getAdminSettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const settings = await prisma.aISettings.findFirst();
      return successResponse(res, settings);
    } catch (error) {
      console.error('Error in getAdminSettings:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  },

  updateAdminSettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const settings = await prisma.aISettings.findFirst();
      const updated = await prisma.aISettings.update({
        where: { id: settings?.id || 'singleton' },
        data: req.body,
      });
      return successResponse(res, updated, 'AI settings updated successfully');
    } catch (error) {
      console.error('Error in updateAdminSettings:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  },

  getAdminUsage: async (req: Request, res: Response): Promise<Response> => {
    try {
      const logs = await prisma.aIUsageLog.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } }
      });

      const totalCostResult = await prisma.aIUsageLog.aggregate({
        _sum: { costUsd: true }
      });

      return successResponse(res, {
        logs,
        totalCost: totalCostResult._sum.costUsd || 0
      });
    } catch (error) {
      console.error('Error in getAdminUsage:', error);
      return errorResponse(res, 'Internal server error', 500);
    }
  },
};

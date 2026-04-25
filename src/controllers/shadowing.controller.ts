import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { transcribeAudio } from '../services/ai/stt.service';
import { checkLevelCompletion } from '../utils/progress.utils';
import { trackLearningActivity } from '../utils/gamification';

export const shadowingController = {
  getStories: async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { currentLevel: true, plan: true, role: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const stories = await prisma.story.findMany({
        where: { levelId: { lte: user.currentLevel }, isActive: true },
        orderBy: { orderIndex: 'asc' },
      });

      const userProgress = await prisma.userShadowingProgress.findMany({
        where: { userId: req.userId, story: { levelId: { lte: user.currentLevel } } },
      });

      const progressMap = new Map(userProgress.map((p) => [p.storyId, p]));

      const storiesWithProgress = stories.map((story) => {
        const progress = progressMap.get(story.id);
        return {
          ...story,
          currentStep: progress?.currentStep || 1,
          accuracyScore: progress?.accuracyScore || null,
          attempts: progress?.attempts || 0,
          completed: progress?.completed || false,
        };
      });

      return successResponse(res, storiesWithProgress);
    } catch (error) {
      console.error('Get stories error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      const story = await prisma.story.findUnique({
        where: { id },
      });

      if (!story) {
        return errorResponse(res, 'Story not found', 404);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true, role: true },
      });

      const progress = await prisma.userShadowingProgress.findUnique({
        where: {
          userId_storyId: {
            userId: req.userId!,
            storyId: id,
          },
        },
      });

      return successResponse(res, {
        ...story,
        currentStep: progress?.currentStep || 1,
        accuracyScore: progress?.accuracyScore || null,
        completed: progress?.completed || false,
      });
    } catch (error) {
      console.error('Get story error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  transcribe: async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.file) {
        return errorResponse(res, 'No audio file uploaded', 400);
      }

      console.log('Transcribing audio file:', {
        size: req.file.buffer.length,
        mimetype: req.file.mimetype,
        userId: req.userId
      });

      // Validate minimum audio size
      if (req.file.buffer.length < 1024) {
        return errorResponse(
          res, 
          'التسجيل قصير جداً. يرجى التحدث لمدة ثانية واحدة على الأقل.', 
          400
        );
      }

      const result = await transcribeAudio(
        req.userId!,
        req.file.buffer,
        req.file.mimetype
      );

      console.log('Transcription result:', result.transcript);

      // Handle empty transcript gracefully
      if (!result.transcript || result.transcript.trim().length === 0) {
        return errorResponse(
          res,
          'لم يتم التعرف على الكلام. يرجى التحدث بصوت أعلى أو التحقق من الميكروفون.',
          422
        );
      }

      return successResponse(res, { transcript: result.transcript });
    } catch (error: any) {
      console.error('Transcribe error:', error);
      
      // Handle specific error types with user-friendly messages
      if (error.message?.includes('AUDIO_TOO_SHORT')) {
        return errorResponse(res, 'التسجيل قصير جداً. يرجى التحدث لمدة أطول.', 400);
      }
      if (error.message?.includes('AUDIO_SILENT')) {
        return errorResponse(res, 'لم يتم اكتشاف صوت. يرجى التحقق من الميكروفون.', 400);
      }
      if (error.message?.includes('NO_RESULT')) {
        return errorResponse(res, 'لم يتم التعرف على الكلام. يرجى المحاولة مرة أخرى.', 422);
      }
      
      return errorResponse(res, 'فشل التعرف على الكلام. يرجى المحاولة مرة أخرى.', 500);
    }
  },

  compare: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { originalText, userTranscript } = req.body;

      if (!originalText || !userTranscript) {
        return errorResponse(res, 'Original text and user transcript required', 400);
      }

      const originalWords = originalText.toLowerCase().trim().split(/\s+/);
      const userWords = userTranscript.toLowerCase().trim().split(/\s+/);

      // Use LCS (Longest Common Subsequence) to count correctly spoken words
      // This handles insertions and deletions gracefully
      const m = originalWords.length;
      const n = userWords.length;
      const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (originalWords[i - 1] === userWords[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }

      const correctWords = dp[m][n];
      const accuracy = Math.round((correctWords / originalWords.length) * 100);

      return successResponse(res, {
        accuracy,
        correctWords,
        totalWords: originalWords.length,
        originalLength: originalText.length,
        transcriptLength: userTranscript.length,
      });
    } catch (error) {
      console.error('Compare error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  saveProgress: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { currentStep, accuracyScore } = req.body;

      const progress = await prisma.userShadowingProgress.upsert({
        where: {
          userId_storyId: {
            userId: req.userId!,
            storyId: id,
          },
        },
        update: {
          currentStep,
          ...(accuracyScore && { accuracyScore }),
          attempts: { increment: 1 },
        },
        create: {
          userId: req.userId!,
          storyId: id,
          currentStep,
          accuracyScore,
          attempts: 1,
        },
      });

      return successResponse(res, progress, 'Progress saved');
    } catch (error) {
      console.error('Save progress error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  markComplete: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      const progress = await prisma.userShadowingProgress.upsert({
        where: {
          userId_storyId: {
            userId: req.userId!,
            storyId: id,
          },
        },
        update: {
          completed: true,
          completedAt: new Date(),
        },
        create: {
          userId: req.userId!,
          storyId: id,
          completed: true,
          completedAt: new Date(),
        },
      });

      const story = await prisma.story.findUnique({
        where: { id },
        select: { levelId: true },
      });

      if (story) {
        // Track learning activity for gamification (streak, points, achievements)
        await trackLearningActivity(req.userId!, 'shadowing');

        // Check if ALL stories for this level are now complete and advance level if so
        await checkLevelCompletion(req.userId!, story.levelId);
      }

      return successResponse(res, progress, 'Story completed');
    } catch (error) {
      console.error('Mark complete error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
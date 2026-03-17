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

      const hasPremiumAccess = user.plan === 'PREMIUM' || user.role === 'ADMIN';
      if (!hasPremiumAccess) {
        return errorResponse(res, 'Premium subscription required for shadowing', 403);
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
      const { id } = req.params;

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

      if (user?.plan !== 'PREMIUM' && user?.role !== 'ADMIN') {
        return errorResponse(res, 'Premium subscription required', 403);
      }

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

      const result = await transcribeAudio(
        req.userId!,
        req.file.buffer,
        req.file.mimetype
      );

      console.log('Transcription result:', result.transcript);

      return successResponse(res, { transcript: result.transcript });
    } catch (error) {
      console.error('Transcribe error:', error);
      return errorResponse(res, 'Transcription failed', 500);
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

      let correctWords = 0;
      let originalIndex = 0;

      for (const userWord of userWords) {
        if (originalWords[originalIndex] === userWord) {
          correctWords++;
        }
        originalIndex++;
      }

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
      const { id } = req.params;
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
      const { id } = req.params;

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
        const completion = await prisma.userLevelCompletion.findUnique({
          where: {
            userId_levelId: {
              userId: req.userId!,
              levelId: story.levelId,
            },
          },
        });

        if (completion) {
          await prisma.userLevelCompletion.update({
            where: { id: completion.id },
            data: { shadowingDone: true },
          });
        } else {
          await prisma.userLevelCompletion.create({
            data: {
              userId: req.userId!,
              levelId: story.levelId,
              shadowingDone: true,
            },
          });
        }

        // Track learning activity for gamification (streak, points, achievements)
        await trackLearningActivity(req.userId!, 'shadowing');
      }

      return successResponse(res, progress, 'Story completed');
    } catch (error) {
      console.error('Mark complete error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
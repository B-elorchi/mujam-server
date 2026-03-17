import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../../config/database';
import { successResponse, errorResponse } from '../../utils/apiResponse';
import { uploadFile, deleteFile } from '../../services/storage';
import { generateWordTiming } from '../../services/ai/stt.service';

export const adminStoryController = {
  // GET stories for a level
  getStories: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelIdParam = req.query.levelId;
      const levelId = parseInt(Array.isArray(levelIdParam) ? levelIdParam[0] : levelIdParam || '0');

      if (!levelId) {
        return errorResponse(res, 'معرف المستوى مطلوب', 400);
      }

      const stories = await prisma.story.findMany({
        where: { levelId, isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          levelId: true,
          titleAr: true,
          titleEn: true,
          fullText: true,
          audioUrl: true,
          wordsTiming: true,
          orderIndex: true,
          createdAt: true,
        },
      });

      return successResponse(res, { stories });
    } catch (error) {
      console.error('Get stories error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // GET single story
  getStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const story = await prisma.story.findUnique({
        where: { id },
        include: {
          level: {
            select: { id: true, titleAr: true },
          },
        },
      });

      if (!story) {
        return errorResponse(res, 'القصة غير موجودة', 404);
      }

      return successResponse(res, story);
    } catch (error) {
      console.error('Get story error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST create story with audio upload
  createStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'بيانات غير صالحة', 400, errors.array());
      }

      const { levelId, titleAr, titleEn, fullText, orderIndex, wordsTiming } = req.body;
      const audioFile = (req as any).file;

      if (!audioFile) {
        return errorResponse(res, 'ملف الصوت مطلوب', 400);
      }

      // Upload audio to MinIO
      const audioUrl = await uploadFile(
        'audio-stories',
        audioFile.buffer,
        `${Date.now()}-${audioFile.originalname}`,
        audioFile.mimetype
      );

      // Generate word timing if not provided
      let parsedWordsTiming = null;
      if (wordsTiming) {
        parsedWordsTiming = JSON.parse(wordsTiming);
      } else {
        console.log('Auto-generating word timing using Deepgram STT...');
        parsedWordsTiming = await generateWordTiming(
          req.userId!,
          audioFile.buffer,
          audioFile.mimetype,
          fullText
        );
      }

      // Create story
      const story = await prisma.story.create({
        data: {
          levelId: parseInt(levelId),
          titleAr,
          titleEn: titleEn || null,
          fullText,
          audioUrl,
          wordsTiming: parsedWordsTiming,
          orderIndex: parseInt(orderIndex),
        },
      });

      return successResponse(
        res,
        {
          id: story.id,
          levelId: story.levelId,
          titleAr: story.titleAr,
          audioUrl: story.audioUrl,
          wordsTiming: story.wordsTiming,
          wordCount: parsedWordsTiming ? parsedWordsTiming.length : 0,
        },
        'تم إنشاء القصة بنجاح',
        201
      );
    } catch (error) {
      console.error('Create story error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // PATCH update story
  updateStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'بيانات غير صالحة', 400, errors.array());
      }

      const { id } = req.params;
      const { titleAr, titleEn, fullText, orderIndex } = req.body;
      const audioFile = (req as any).file;

      const existing = await prisma.story.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'القصة غير موجودة', 404);
      }

      const updateData: any = {};

      if (titleAr) updateData.titleAr = titleAr;
      if (titleEn !== undefined) updateData.titleEn = titleEn;
      if (fullText) updateData.fullText = fullText;
      if (orderIndex) updateData.orderIndex = parseInt(orderIndex);

      // If new audio uploaded, replace old one
      if (audioFile) {
        // Delete old audio
        if (existing.audioUrl) {
          await deleteFile(existing.audioUrl).catch((err) =>
            console.warn('Failed to delete old audio:', err)
          );
        }

        // Upload new audio
        updateData.audioUrl = await uploadFile(
          'audio-stories',
          audioFile.buffer,
          `${Date.now()}-${audioFile.originalname}`,
          audioFile.mimetype
        );

        // Regenerate word timing
        console.log('Regenerating word timing for new audio...');
        updateData.wordsTiming = await generateWordTiming(
          req.userId!,
          audioFile.buffer,
          audioFile.mimetype,
          fullText || existing.fullText
        );
      }

      const updated = await prisma.story.update({
        where: { id },
        data: updateData,
      });

      return successResponse(res, updated, 'تم تحديث القصة بنجاح');
    } catch (error) {
      console.error('Update story error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // DELETE story (soft delete)
  deleteStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const story = await prisma.story.findUnique({ where: { id } });
      if (!story) {
        return errorResponse(res, 'القصة غير موجودة', 404);
      }

      await prisma.story.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(res, null, 'تم حذف القصة بنجاح');
    } catch (error) {
      console.error('Delete story error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST regenerate word timing
  regenerateTiming: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      const story = await prisma.story.findUnique({ where: { id } });
      if (!story) {
        return errorResponse(res, 'القصة غير موجودة', 404);
      }

      if (!story.audioUrl) {
        return errorResponse(res, 'لا يوجد ملف صوت لهذه القصة', 400);
      }

      // Download audio from MinIO
      // For now, return error - admin should re-upload audio
      return errorResponse(
        res,
        'لإعادة توليد التوقيت، يرجى تحديث القصة وإعادة رفع ملف الصوت',
        400
      );
    } catch (error) {
      console.error('Regenerate timing error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST bulk generate audio for all stories
  bulkGenerateAudio: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { textToSpeech } = await import('../../services/ai/tts.service');
      
      const stories = await prisma.story.findMany({
        where: { 
          isActive: true,
          audioUrl: null, // Only generate for stories without audio
        },
      });

      if (stories.length === 0) {
        return successResponse(res, { generated: 0, total: 0 }, 'جميع القصص لديها ملفات صوتية بالفعل');
      }

      let generated = 0;
      let failed = 0;

      for (const story of stories) {
        try {
          console.log(`Generating audio for story: ${story.titleAr}...`);
          
          // Generate TTS audio
          const audioBuffer = await textToSpeech(story.fullText, 'normal');
          
          // Upload to MinIO
          const audioUrl = await uploadFile(
            'audio-stories',
            audioBuffer,
            `story-${story.id}-${Date.now()}.mp3`,
            'audio/mpeg'
          );

          // Update story with audio URL
          await prisma.story.update({
            where: { id: story.id },
            data: { audioUrl },
          });

          generated++;
          console.log(`✓ Generated audio for: ${story.titleAr}`);
        } catch (error) {
          console.error(`✗ Failed to generate audio for story ${story.id}:`, error);
          failed++;
        }
      }

      return successResponse(
        res,
        { generated, failed, total: stories.length },
        `تم توليد الصوت لـ ${generated} قصة`
      );
    } catch (error) {
      console.error('Bulk generate audio error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },
};

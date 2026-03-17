import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { uploadFile, deleteFile } from '../services/storage';
import { textToSpeech, textToSpeechSlow } from '../services/ai/tts.service';

export const adminSentenceController = {
  // GET sentences for a level
  getSentences: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = parseInt(req.params.levelId as string);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;

      const [sentences, total] = await Promise.all([
        prisma.sentence.findMany({
          where: { levelId },
          orderBy: { orderIndex: 'asc' },
          skip,
          take: limit,
        }),
        prisma.sentence.count({ where: { levelId } }),
      ]);

      return successResponse(res, {
        sentences,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('Get sentences error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST create sentence
  createSentence: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const levelId = parseInt(req.params.levelId as string);
      const { textEn, textAr, orderIndex } = req.body;

      // Check if level exists
      const level = await prisma.level.findUnique({ where: { id: levelId } });
      if (!level) {
        return errorResponse(res, 'المستوى غير موجود', 404);
      }

      // Handle file uploads if present
      let audioUrlNormal = null;
      let audioUrlSlow = null;

      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        if (files.audioNormal && files.audioNormal[0]) {
          audioUrlNormal = await uploadFile(
            'audioSentences',
            files.audioNormal[0].buffer,
            `${Date.now()}-normal.mp3`,
            'audio/mpeg'
          );
        }

        if (files.audioSlow && files.audioSlow[0]) {
          audioUrlSlow = await uploadFile(
            'audioSentences',
            files.audioSlow[0].buffer,
            `${Date.now()}-slow.mp3`,
            'audio/mpeg'
          );
        }
      }

      const sentence = await prisma.sentence.create({
        data: {
          textEn,
          textAr,
          audioUrlNormal,
          audioUrlSlow,
          orderIndex,
          levelId,
        },
      });

      return successResponse(res, sentence, 'تم إضافة الجملة بنجاح', 201);
    } catch (error) {
      console.error('Create sentence error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // PATCH update sentence
  updateSentence: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const id = req.params.id as string;
      const { textEn, textAr, orderIndex } = req.body;

      const existing = await prisma.sentence.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'الجملة غير موجودة', 404);
      }

      const updateData: any = {};
      if (textEn !== undefined) updateData.textEn = textEn;
      if (textAr !== undefined) updateData.textAr = textAr;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;

      // Handle file uploads if present
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        if (files.audioNormal && files.audioNormal[0]) {
          // Delete old file if exists
          if (existing.audioUrlNormal) {
            await deleteFile(existing.audioUrlNormal).catch(err => 
              console.error('Failed to delete old audio:', err)
            );
          }
          updateData.audioUrlNormal = await uploadFile(
            'audioSentences',
            files.audioNormal[0].buffer,
            `${Date.now()}-normal.mp3`,
            'audio/mpeg'
          );
        }

        if (files.audioSlow && files.audioSlow[0]) {
          // Delete old file if exists
          if (existing.audioUrlSlow) {
            await deleteFile(existing.audioUrlSlow).catch(err => 
              console.error('Failed to delete old slow audio:', err)
            );
          }
          updateData.audioUrlSlow = await uploadFile(
            'audioSentences',
            files.audioSlow[0].buffer,
            `${Date.now()}-slow.mp3`,
            'audio/mpeg'
          );
        }
      }

      const sentence = await prisma.sentence.update({
        where: { id },
        data: updateData,
      });

      return successResponse(res, sentence, 'تم تحديث الجملة بنجاح');
    } catch (error) {
      console.error('Update sentence error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // DELETE sentence (soft delete)
  deleteSentence: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const existing = await prisma.sentence.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'الجملة غير موجودة', 404);
      }

      // Soft delete by setting isActive to false
      await prisma.sentence.update({
        where: { id },
        data: { isActive: false },
      });

      return successResponse(res, null, 'تم حذف الجملة بنجاح');
    } catch (error) {
      console.error('Delete sentence error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  // POST generate audio using TTS
  generateAudio: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = req.params.id as string;

      const sentence = await prisma.sentence.findUnique({ where: { id } });
      if (!sentence) {
        return errorResponse(res, 'الجملة غير موجودة', 404);
      }

      // Generate normal speed audio
      const normalBuffer = await textToSpeech(sentence.textEn, 'normal', req.userId);
      const audioUrlNormal = await uploadFile(
        'audioSentences',
        normalBuffer,
        `${id}-normal.mp3`,
        'audio/mpeg'
      );

      // Generate slow speed audio
      const slowBuffer = await textToSpeechSlow(sentence.textEn, req.userId);
      const audioUrlSlow = await uploadFile(
        'audioSentences',
        slowBuffer,
        `${id}-slow.mp3`,
        'audio/mpeg'
      );

      // Update sentence with new audio URLs
      const updated = await prisma.sentence.update({
        where: { id },
        data: { audioUrlNormal, audioUrlSlow },
      });

      return successResponse(res, {
        audioUrlNormal: updated.audioUrlNormal,
        audioUrlSlow: updated.audioUrlSlow,
      }, 'تم توليد الصوت بنجاح');
    } catch (error) {
      console.error('Generate audio error:', error);
      return errorResponse(res, 'فشل توليد الصوت', 500);
    }
  },

  // POST bulk generate audio for all sentences in a level
  bulkGenerateAudio: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = parseInt(req.params.levelId as string);

      // Get all sentences without audio
      const sentences = await prisma.sentence.findMany({
        where: {
          levelId,
          OR: [
            { audioUrlNormal: null },
            { audioUrlSlow: null },
          ],
        },
      });

      if (sentences.length === 0) {
        return successResponse(res, { generated: 0 }, 'جميع الجمل لديها صوت بالفعل');
      }

      let generated = 0;
      const errors: string[] = [];

      for (const sentence of sentences) {
        try {
          // Generate normal speed if missing
          if (!sentence.audioUrlNormal) {
            const normalBuffer = await textToSpeech(sentence.textEn, 'normal', req.userId);
            const audioUrlNormal = await uploadFile(
              'audioSentences',
              normalBuffer,
              `${sentence.id}-normal.mp3`,
              'audio/mpeg'
            );
            await prisma.sentence.update({
              where: { id: sentence.id },
              data: { audioUrlNormal },
            });
          }

          // Generate slow speed if missing
          if (!sentence.audioUrlSlow) {
            const slowBuffer = await textToSpeechSlow(sentence.textEn, req.userId);
            const audioUrlSlow = await uploadFile(
              'audioSentences',
              slowBuffer,
              `${sentence.id}-slow.mp3`,
              'audio/mpeg'
            );
            await prisma.sentence.update({
              where: { id: sentence.id },
              data: { audioUrlSlow },
            });
          }

          generated++;
        } catch (err: any) {
          console.error(`Failed to generate audio for sentence ${sentence.id}:`, err);
          errors.push(`Sentence ${sentence.id}: ${err.message}`);
        }
      }

      return successResponse(res, {
        generated,
        total: sentences.length,
        errors: errors.length > 0 ? errors : undefined,
      }, `تم توليد الصوت لـ ${generated} جملة`);
    } catch (error) {
      console.error('Bulk generate audio error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },
};

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { uploadFile, deleteFile } from '../services/storage';
import { textToSpeech, textToSpeechSlow } from '../services/ai/tts.service';

function coerceOptionalString(body: Record<string, unknown>, key: string): string | null | undefined {
  if (body[key] === undefined) return undefined;
  const v = body[key];
  if (v === null || v === '') return null;
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

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

  updateSentenceGrammar: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const sentenceId = req.params.sentenceId as string;
      const body = req.body as Record<string, unknown>;

      const existing = await prisma.sentence.findUnique({ where: { id: sentenceId } });
      if (!existing) {
        return errorResponse(res, 'الجملة غير موجودة', 404);
      }

      const gAr = coerceOptionalString(body, 'grammarTipAr');
      const gEn = coerceOptionalString(body, 'grammarTipEn');
      const pAr = coerceOptionalString(body, 'pronounTipAr');
      const cat = coerceOptionalString(body, 'grammarCategory');
      const diff = coerceOptionalString(body, 'difficultyNote');

      const sentence = await prisma.sentence.update({
        where: { id: sentenceId },
        data: {
          ...(gAr !== undefined && { grammarTipAr: gAr }),
          ...(gEn !== undefined && { grammarTipEn: gEn }),
          ...(pAr !== undefined && { pronounTipAr: pAr }),
          ...(cat !== undefined && { grammarCategory: cat }),
          ...(diff !== undefined && { difficultyNote: diff }),
        },
      });

      return successResponse(res, sentence, 'تم تحديث القواعد لهذه الجملة');
    } catch (error) {
      console.error('Update sentence grammar error:', error);
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
      const grammarTipAr = coerceOptionalString(req.body as Record<string, unknown>, 'grammarTipAr');
      const grammarTipEn = coerceOptionalString(req.body as Record<string, unknown>, 'grammarTipEn');
      const pronounTipAr = coerceOptionalString(req.body as Record<string, unknown>, 'pronounTipAr');
      const grammarCategory = coerceOptionalString(req.body as Record<string, unknown>, 'grammarCategory');
      const difficultyNote = coerceOptionalString(req.body as Record<string, unknown>, 'difficultyNote');

      const existing = await prisma.sentence.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, 'الجملة غير موجودة', 404);
      }

      const updateData: any = {};
      if (textEn !== undefined) updateData.textEn = textEn;
      if (textAr !== undefined) updateData.textAr = textAr;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
      if (grammarTipAr !== undefined) updateData.grammarTipAr = grammarTipAr;
      if (grammarTipEn !== undefined) updateData.grammarTipEn = grammarTipEn;
      if (pronounTipAr !== undefined) updateData.pronounTipAr = pronounTipAr;
      if (grammarCategory !== undefined) updateData.grammarCategory = grammarCategory;
      if (difficultyNote !== undefined) updateData.difficultyNote = difficultyNote;

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
      const normalResult = await textToSpeech(sentence.textEn, 'normal', req.userId);
      const audioUrlNormal = await uploadFile(
        'audioSentences',
        normalResult.buffer,
        `${id}-normal.mp3`,
        normalResult.contentType
      );

      // Generate slow speed audio
      const slowResult = await textToSpeechSlow(sentence.textEn, req.userId);
      const audioUrlSlow = await uploadFile(
        'audioSentences',
        slowResult.buffer,
        `${id}-slow.mp3`,
        slowResult.contentType
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
  // Body: { "force": true } — delete existing files (best effort), regenerate normal + slow for every sentence in the level.
  bulkGenerateAudio: async (req: Request, res: Response): Promise<Response> => {
    try {
      const levelId = parseInt(req.params.levelId as string);
      const force = Boolean((req.body as { force?: boolean })?.force);

      const sentences = await prisma.sentence.findMany({
        where: force
          ? { levelId }
          : {
              levelId,
              OR: [
                { audioUrlNormal: null },
                { audioUrlSlow: null },
                { audioUrlNormal: '' },
                { audioUrlSlow: '' },
              ],
            },
      });

      if (sentences.length === 0) {
        return successResponse(
          res,
          { generated: 0, total: 0, force },
          force ? 'لا توجد جمل في هذا المستوى' : 'جميع الجمل لديها صوت بالفعل'
        );
      }

      let generated = 0;
      const errors: string[] = [];

      for (const sentence of sentences) {
        try {
          let audioUrlNormal = sentence.audioUrlNormal;
          let audioUrlSlow = sentence.audioUrlSlow;

          const needNormal =
            force || !audioUrlNormal || (typeof audioUrlNormal === 'string' && audioUrlNormal.trim() === '');
          const needSlow =
            force || !audioUrlSlow || (typeof audioUrlSlow === 'string' && audioUrlSlow.trim() === '');

          if (needNormal) {
            if (force && audioUrlNormal) {
              await deleteFile(audioUrlNormal).catch((err) =>
                console.warn(`Could not delete old normal audio for sentence ${sentence.id}:`, err)
              );
            }
            const normalResult = await textToSpeech(sentence.textEn, 'normal', req.userId);
            audioUrlNormal = await uploadFile(
              'audioSentences',
              normalResult.buffer,
              `${sentence.id}-normal.mp3`,
              normalResult.contentType
            );
          }

          if (needSlow) {
            if (force && audioUrlSlow) {
              await deleteFile(audioUrlSlow).catch((err) =>
                console.warn(`Could not delete old slow audio for sentence ${sentence.id}:`, err)
              );
            }
            const slowResult = await textToSpeechSlow(sentence.textEn, req.userId);
            audioUrlSlow = await uploadFile(
              'audioSentences',
              slowResult.buffer,
              `${sentence.id}-slow.mp3`,
              slowResult.contentType
            );
          }

          if (needNormal || needSlow) {
            await prisma.sentence.update({
              where: { id: sentence.id },
              data: {
                ...(needNormal && { audioUrlNormal }),
                ...(needSlow && { audioUrlSlow }),
              },
            });
            generated++;
          }
        } catch (err: any) {
          console.error(`Failed to generate audio for sentence ${sentence.id}:`, err);
          errors.push(`Sentence ${sentence.id}: ${err.message}`);
        }
      }

      return successResponse(res, {
        generated,
        total: sentences.length,
        force,
        errors: errors.length > 0 ? errors : undefined,
      }, `تم توليد الصوت لـ ${generated} جملة`);
    } catch (error) {
      console.error('Bulk generate audio error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },
};

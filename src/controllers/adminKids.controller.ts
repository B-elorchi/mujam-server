import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { uploadFile } from '../config/s3';
import { successResponse, errorResponse } from '../utils/apiResponse';

const KIDS_COLORS = ['blue', 'sky', 'yellow', 'pink', 'green', 'purple', 'orange'] as const;
const DEFAULT_KIDS_STORY_COVER = '/images/kids/stories/default-cover.svg';

function paramId(req: Request, key = 'id'): string {
  const raw = req.params[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

function parseOptionalCues(raw: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return Prisma.JsonNull;
  if (!Array.isArray(raw)) return undefined;
  const cues = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const start = typeof row.start === 'number' ? row.start : Number(row.start);
      const end = typeof row.end === 'number' ? row.end : Number(row.end);
      const text = typeof row.text === 'string' ? row.text.trim() : '';
      if (!Number.isFinite(start) || !Number.isFinite(end) || !text) return null;
      return { start, end, text };
    })
    .filter(Boolean);
  return cues as Prisma.InputJsonValue;
}

type NormalizedStoryPage = {
  orderIndex: number;
  textEn: string;
  textAr: string;
  imageUrl: string | null;
  icon: string | null;
};

function normalizeStoryPages(raw: unknown): NormalizedStoryPage[] | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const textEn = String(row.textEn ?? '').trim();
      const textAr = String(row.textAr ?? '').trim();
      if (!textEn || !textAr) return null;
      const rawOrder = row.orderIndex;
      const orderIndex =
        rawOrder === undefined || rawOrder === null || rawOrder === ''
          ? index
          : Math.max(0, Number(rawOrder));
      return {
        orderIndex: Number.isFinite(orderIndex) ? orderIndex : index,
        textEn,
        textAr,
        imageUrl: row.imageUrl == null ? null : String(row.imageUrl).trim() || null,
        icon: row.icon == null ? null : String(row.icon).trim() || null,
      };
    })
    .filter((page): page is NormalizedStoryPage => Boolean(page))
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((page, index) => ({ ...page, orderIndex: index }));
}

function storyTextFromPages(pages: NormalizedStoryPage[], lang: 'en' | 'ar'): string {
  return pages.map((page) => (lang === 'ar' ? page.textAr : page.textEn)).join(' ');
}

export const adminKidsController = {
  listModules: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const modules = await prisma.kidsModule.findMany({
        orderBy: { orderIndex: 'asc' },
        include: { _count: { select: { screens: true } } },
      });
      return successResponse(
        res,
        modules.map((m) => ({
          id: m.id,
          titleEn: m.titleEn,
          titleAr: m.titleAr,
          icon: m.icon,
          color: m.color,
          orderIndex: m.orderIndex,
          isActive: m.isActive,
          progress: m.progress,
          stars: m.stars,
          screenCount: m._count.screens,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }))
      );
    } catch (error) {
      console.error('Admin list kids modules error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const mod = await prisma.kidsModule.findUnique({
        where: { id },
        include: { screens: { orderBy: { orderIndex: 'asc' } } },
      });
      if (!mod) return errorResponse(res, 'Module not found', 404);
      return successResponse(res, mod);
    } catch (error) {
      console.error('Admin get kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const { id, titleEn, titleAr, icon, color, orderIndex, isActive } = req.body as {
        id: string;
        titleEn: string;
        titleAr: string;
        icon?: string;
        color?: string;
        orderIndex?: number;
        isActive?: boolean;
      };

      const existing = await prisma.kidsModule.findUnique({ where: { id: id.trim() } });
      if (existing) return errorResponse(res, 'Module id already exists', 409);

      let nextOrder = orderIndex;
      if (nextOrder === undefined || nextOrder === null) {
        const max = await prisma.kidsModule.aggregate({ _max: { orderIndex: true } });
        nextOrder = (max._max.orderIndex ?? -1) + 1;
      }

      const mod = await prisma.kidsModule.create({
        data: {
          id: id.trim(),
          titleEn: titleEn.trim(),
          titleAr: titleAr.trim(),
          icon: icon?.trim() || '📚',
          color: KIDS_COLORS.includes(color as (typeof KIDS_COLORS)[number]) ? color! : 'blue',
          orderIndex: Number(nextOrder),
          isActive: isActive !== false,
        },
      });

      return successResponse(res, mod, 'Kids module created', 201);
    } catch (error) {
      console.error('Create kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const id = paramId(req);
      const existing = await prisma.kidsModule.findUnique({ where: { id } });
      if (!existing) return errorResponse(res, 'Module not found', 404);

      const { titleEn, titleAr, icon, color, orderIndex, isActive, progress, stars } = req.body as {
        titleEn?: string;
        titleAr?: string;
        icon?: string;
        color?: string;
        orderIndex?: number;
        isActive?: boolean;
        progress?: number;
        stars?: number;
      };

      const mod = await prisma.kidsModule.update({
        where: { id },
        data: {
          ...(titleEn !== undefined && { titleEn: titleEn.trim() }),
          ...(titleAr !== undefined && { titleAr: titleAr.trim() }),
          ...(icon !== undefined && { icon: icon.trim() }),
          ...(color !== undefined &&
            KIDS_COLORS.includes(color as (typeof KIDS_COLORS)[number]) && { color }),
          ...(orderIndex !== undefined && { orderIndex: Number(orderIndex) }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
          ...(progress !== undefined && { progress: Math.min(100, Math.max(0, Number(progress))) }),
          ...(stars !== undefined && { stars: Math.min(3, Math.max(0, Number(stars))) }),
        },
      });

      return successResponse(res, mod, 'Kids module updated');
    } catch (error) {
      console.error('Update kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  removeModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const existing = await prisma.kidsModule.findUnique({ where: { id } });
      if (!existing) return errorResponse(res, 'Module not found', 404);

      await prisma.kidsModule.update({
        where: { id },
        data: { isActive: false },
      });
      return successResponse(res, null, 'Kids module deactivated');
    } catch (error) {
      console.error('Delete kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createScreen: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const moduleId = paramId(req);
      const mod = await prisma.kidsModule.findUnique({ where: { id: moduleId } });
      if (!mod) return errorResponse(res, 'Module not found', 404);

      const { type, orderIndex, payload } = req.body as {
        type: string;
        orderIndex?: number;
        payload?: Record<string, unknown>;
      };

      let nextOrder = orderIndex;
      if (nextOrder === undefined || nextOrder === null) {
        const max = await prisma.kidsLessonScreen.aggregate({
          where: { moduleId },
          _max: { orderIndex: true },
        });
        nextOrder = (max._max.orderIndex ?? -1) + 1;
      }

      const screen = await prisma.kidsLessonScreen.create({
        data: {
          moduleId,
          type: type.trim(),
          orderIndex: Number(nextOrder),
          payload: (payload ?? {}) as Prisma.InputJsonValue,
        },
      });

      return successResponse(res, screen, 'Lesson screen created', 201);
    } catch (error) {
      console.error('Create kids screen error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateScreen: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const screenId = paramId(req);
      const existing = await prisma.kidsLessonScreen.findUnique({ where: { id: screenId } });
      if (!existing) return errorResponse(res, 'Screen not found', 404);

      const { type, orderIndex, payload } = req.body as {
        type?: string;
        orderIndex?: number;
        payload?: Record<string, unknown>;
      };

      const screen = await prisma.kidsLessonScreen.update({
        where: { id: screenId },
        data: {
          ...(type !== undefined && { type: type.trim() }),
          ...(orderIndex !== undefined && { orderIndex: Number(orderIndex) }),
          ...(payload !== undefined && { payload: payload as Prisma.InputJsonValue }),
        },
      });

      return successResponse(res, screen, 'Lesson screen updated');
    } catch (error) {
      console.error('Update kids screen error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  removeScreen: async (req: Request, res: Response): Promise<Response> => {
    try {
      const screenId = paramId(req);
      const existing = await prisma.kidsLessonScreen.findUnique({ where: { id: screenId } });
      if (!existing) return errorResponse(res, 'Screen not found', 404);

      await prisma.kidsLessonScreen.delete({ where: { id: screenId } });
      return successResponse(res, null, 'Lesson screen deleted');
    } catch (error) {
      console.error('Delete kids screen error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  reorderScreens: async (req: Request, res: Response): Promise<Response> => {
    try {
      const moduleId = paramId(req);
      const { items } = req.body as { items?: { id: string; orderIndex: number }[] };

      if (!Array.isArray(items) || items.length === 0) {
        return errorResponse(res, 'items must be a non-empty array', 400);
      }

      await prisma.$transaction(
        items.map((item) =>
          prisma.kidsLessonScreen.update({
            where: { id: item.id },
            data: { orderIndex: Number(item.orderIndex) },
          })
        )
      );

      const screens = await prisma.kidsLessonScreen.findMany({
        where: { moduleId },
        orderBy: { orderIndex: 'asc' },
      });

      return successResponse(res, screens, 'Screens reordered');
    } catch (error) {
      console.error('Reorder kids screens error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  listStories: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const stories = await prisma.kidsStory.findMany({
        orderBy: { orderIndex: 'asc' },
        include: {
          pages: { orderBy: { orderIndex: 'asc' } },
        },
      });
      return successResponse(res, stories);
    } catch (error) {
      console.error('Admin list kids stories error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const story = await prisma.kidsStory.findUnique({
        where: { id },
        include: { pages: { orderBy: { orderIndex: 'asc' } } },
      });
      if (!story) return errorResponse(res, 'Story not found', 404);
      return successResponse(res, story);
    } catch (error) {
      console.error('Admin get kids story error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const body = req.body as Record<string, unknown>;
      const id = String(body.id || '').trim();
      const titleEn = String(body.titleEn || '').trim();
      const titleAr = String(body.titleAr || '').trim();
      const pages = normalizeStoryPages(body.pages);
      const textEn = pages?.length ? storyTextFromPages(pages, 'en') : String(body.textEn || '').trim();
      const textAr = pages?.length ? storyTextFromPages(pages, 'ar') : String(body.textAr || '').trim();
      const coverUrl = String(body.coverUrl || DEFAULT_KIDS_STORY_COVER).trim();

      if (!id || !titleEn || !titleAr || !textEn || !textAr || !coverUrl) {
        return errorResponse(res, 'id, titles, coverUrl, and story text/pages are required', 400);
      }
      if (pages !== null && pages.length === 0) {
        return errorResponse(res, 'pages must include textEn and textAr when provided', 400);
      }

      const existing = await prisma.kidsStory.findUnique({ where: { id } });
      if (existing) return errorResponse(res, 'Story id already exists', 409);

      let nextOrder = body.orderIndex as number | undefined;
      if (nextOrder === undefined || nextOrder === null) {
        const max = await prisma.kidsStory.aggregate({ _max: { orderIndex: true } });
        nextOrder = (max._max.orderIndex ?? -1) + 1;
      }

      const color = String(body.accentColor || 'sky');
      const story = await prisma.kidsStory.create({
        data: {
          id,
          titleEn,
          titleAr,
          summaryEn: body.summaryEn != null ? String(body.summaryEn).trim() : null,
          summaryAr: body.summaryAr != null ? String(body.summaryAr).trim() : null,
          coverEmoji: body.coverEmoji != null ? String(body.coverEmoji).trim() || '📖' : '📖',
          coverUrl,
          audioUrl: body.audioUrl != null ? String(body.audioUrl).trim() || null : null,
          textEn,
          textAr,
          cuesEn: parseOptionalCues(body.cuesEn) ?? Prisma.JsonNull,
          cuesAr: parseOptionalCues(body.cuesAr) ?? Prisma.JsonNull,
          accentColor: KIDS_COLORS.includes(color as (typeof KIDS_COLORS)[number]) ? color : 'sky',
          orderIndex: Number(nextOrder),
          durationSec:
            body.durationSec != null && body.durationSec !== ''
              ? Number(body.durationSec)
              : null,
          isActive: body.isActive !== false,
          ...(pages?.length
            ? {
                pages: {
                  create: pages.map((page) => ({
                    orderIndex: page.orderIndex,
                    textEn: page.textEn,
                    textAr: page.textAr,
                    imageUrl: page.imageUrl,
                    icon: page.icon,
                  })),
                },
              }
            : {}),
        },
        include: { pages: { orderBy: { orderIndex: 'asc' } } },
      });

      return successResponse(res, story, 'Kids story created', 201);
    } catch (error) {
      console.error('Create kids story error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0]?.msg || 'Validation error', 400);
      }

      const id = paramId(req);
      const existing = await prisma.kidsStory.findUnique({ where: { id } });
      if (!existing) return errorResponse(res, 'Story not found', 404);

      const body = req.body as Record<string, unknown>;
      const color =
        body.accentColor !== undefined ? String(body.accentColor) : undefined;
      const pages = normalizeStoryPages(body.pages);
      if (pages !== null && pages.length === 0) {
        return errorResponse(res, 'pages must include textEn and textAr when provided', 400);
      }

      const updateData: Prisma.KidsStoryUpdateInput = {
          ...(body.titleEn !== undefined && { titleEn: String(body.titleEn).trim() }),
          ...(body.titleAr !== undefined && { titleAr: String(body.titleAr).trim() }),
          ...(body.summaryEn !== undefined && {
            summaryEn: body.summaryEn == null ? null : String(body.summaryEn).trim(),
          }),
          ...(body.summaryAr !== undefined && {
            summaryAr: body.summaryAr == null ? null : String(body.summaryAr).trim(),
          }),
          ...(body.coverEmoji !== undefined && {
            coverEmoji: String(body.coverEmoji).trim() || '📖',
          }),
          ...(body.coverUrl !== undefined && {
            coverUrl:
              body.coverUrl == null
                ? DEFAULT_KIDS_STORY_COVER
                : String(body.coverUrl).trim() || DEFAULT_KIDS_STORY_COVER,
          }),
          ...(body.audioUrl !== undefined && {
            audioUrl: body.audioUrl == null ? null : String(body.audioUrl).trim() || null,
          }),
          ...(pages?.length
            ? {
                textEn: storyTextFromPages(pages, 'en'),
                textAr: storyTextFromPages(pages, 'ar'),
              }
            : {
                ...(body.textEn !== undefined && { textEn: String(body.textEn).trim() }),
                ...(body.textAr !== undefined && { textAr: String(body.textAr).trim() }),
              }),
          ...(body.cuesEn !== undefined && { cuesEn: parseOptionalCues(body.cuesEn) }),
          ...(body.cuesAr !== undefined && { cuesAr: parseOptionalCues(body.cuesAr) }),
          ...(color !== undefined && {
            accentColor: KIDS_COLORS.includes(color as (typeof KIDS_COLORS)[number])
              ? color
              : existing.accentColor,
          }),
          ...(body.orderIndex !== undefined && { orderIndex: Number(body.orderIndex) }),
          ...(body.durationSec !== undefined && {
            durationSec:
              body.durationSec == null || body.durationSec === ''
                ? null
                : Number(body.durationSec),
          }),
          ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
      };

      const story = await prisma.$transaction(async (tx) => {
        await tx.kidsStory.update({
          where: { id },
          data: updateData,
        });
        if (pages !== null) {
          await tx.kidsStoryPage.deleteMany({ where: { storyId: id } });
          if (pages.length > 0) {
            await tx.kidsStoryPage.createMany({
              data: pages.map((page) => ({
                storyId: id,
                orderIndex: page.orderIndex,
                textEn: page.textEn,
                textAr: page.textAr,
                imageUrl: page.imageUrl,
                icon: page.icon,
              })),
            });
          }
        }
        return tx.kidsStory.findUnique({
          where: { id },
          include: { pages: { orderBy: { orderIndex: 'asc' } } },
        });
      });

      return successResponse(res, story, 'Kids story updated');
    } catch (error) {
      console.error('Update kids story error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  removeStory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const existing = await prisma.kidsStory.findUnique({ where: { id } });
      if (!existing) return errorResponse(res, 'Story not found', 404);
      await prisma.kidsStory.update({ where: { id }, data: { isActive: false } });
      return successResponse(res, null, 'Kids story deactivated');
    } catch (error) {
      console.error('Delete kids story error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  uploadStoryCover: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const existing = await prisma.kidsStory.findUnique({ where: { id } });
      if (!existing) return errorResponse(res, 'Story not found', 404);
      if (!req.file) return errorResponse(res, 'No image file uploaded', 400);

      const { url } = await uploadFile(req.file.buffer, 'kids-stories/covers', req.file.mimetype);
      const story = await prisma.kidsStory.update({
        where: { id },
        data: { coverUrl: url },
        include: { pages: { orderBy: { orderIndex: 'asc' } } },
      });

      return successResponse(res, story, 'Kids story cover uploaded');
    } catch (error) {
      console.error('Upload kids story cover error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  uploadStoryPageImage: async (req: Request, res: Response): Promise<Response> => {
    try {
      const pageId = paramId(req, 'pageId');
      const existing = await prisma.kidsStoryPage.findUnique({ where: { id: pageId } });
      if (!existing) return errorResponse(res, 'Story page not found', 404);
      if (!req.file) return errorResponse(res, 'No image file uploaded', 400);

      const { url } = await uploadFile(req.file.buffer, 'kids-stories/pages', req.file.mimetype);
      const page = await prisma.kidsStoryPage.update({
        where: { id: pageId },
        data: { imageUrl: url },
      });

      return successResponse(res, page, 'Kids story page image uploaded');
    } catch (error) {
      console.error('Upload kids story page image error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

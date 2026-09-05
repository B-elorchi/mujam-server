import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { textToSpeechForKids } from '../services/ai/tts.service';
import { resolveUsageUserId } from '../services/ai/usage.service';

/** In-memory TTS cache for common kids vocabulary (avoids repeat provider calls). */
const kidsAudioCache = new Map<string, { buffer: Buffer; contentType: string }>();
const KIDS_AUDIO_CACHE_MAX = 500;

function kidsAudioCacheKey(text: string, lang: 'en' | 'ar'): string {
  return `${lang}:${text.trim().toLowerCase()}`;
}

function cacheKidsAudio(key: string, entry: { buffer: Buffer; contentType: string }) {
  if (kidsAudioCache.size >= KIDS_AUDIO_CACHE_MAX) {
    const firstKey = kidsAudioCache.keys().next().value;
    if (firstKey) kidsAudioCache.delete(firstKey);
  }
  kidsAudioCache.set(key, entry);
}

/**
 * Serve an audio buffer with HTTP byte-range support.
 *
 * iOS Safari probes every <audio> source with `Range: bytes=0-1` and refuses to
 * play when the server answers 200 with the whole body instead of 206. Chrome
 * and Android tolerate it, which is why kids TTS (Express res.send) was silent
 * on iOS while shadowing (MinIO/S3, full range support) played fine.
 */
function sendAudioWithRangeSupport(
  req: Request,
  res: Response,
  buffer: Buffer,
  contentType: string
): void {
  const total = buffer.length;

  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Accept-Ranges', 'bytes');

  const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range.trim() : '';
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);

  if (!match) {
    res.setHeader('Content-Length', total);
    res.status(200).end(buffer);
    return;
  }

  const [, rawStart, rawEnd] = match;
  let start: number;
  let end: number;

  if (rawStart === '') {
    // Suffix range: last N bytes.
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) {
      res.setHeader('Content-Range', `bytes */${total}`);
      res.status(416).end();
      return;
    }
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? total - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= total) {
    res.setHeader('Content-Range', `bytes */${total}`);
    res.status(416).end();
    return;
  }

  end = Math.min(end, total - 1);

  res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
  res.setHeader('Content-Length', end - start + 1);
  res.status(206).end(buffer.subarray(start, end + 1));
}

type ScreenRow = {
  type: string;
  orderIndex: number;
  payload: unknown;
};

function mapScreen(row: ScreenRow) {
  const payload =
    row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
      ? (row.payload as Record<string, unknown>)
      : {};
  return { type: row.type, ...payload };
}

/** Modules are ordered levels; tier 1–3 groups the home screen. */
function levelFromOrder(orderIndex: number): number {
  if (orderIndex < 6) return 1;
  if (orderIndex < 12) return 2;
  return 3;
}

function mapModule(m: {
  id: string;
  titleEn: string;
  titleAr: string;
  icon: string;
  color: string;
  orderIndex: number;
  progress: number;
  stars: number;
}) {
  return {
    id: m.id,
    titleEn: m.titleEn,
    titleAr: m.titleAr,
    icon: m.icon,
    color: m.color,
    level: levelFromOrder(m.orderIndex),
    orderIndex: m.orderIndex,
    progress: m.progress,
    stars: m.stars,
  };
}

function paramId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

function weekKeyFromDate(d = new Date()): string {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function progressByModule(userId: string): Promise<Map<string, { stars: number; completedAt: Date }>> {
  const rows = await prisma.kidsModuleProgress.findMany({
    where: { userId },
    select: { moduleId: true, stars: true, completedAt: true },
  });
  return new Map(rows.map((r) => [r.moduleId, { stars: r.stars, completedAt: r.completedAt }]));
}

async function aggregateChildStats(userId: string) {
  const [allProgress, weekProgress] = await Promise.all([
    prisma.kidsModuleProgress.findMany({
      where: { userId },
      select: { stars: true, minutesSpent: true },
    }),
    prisma.kidsModuleProgress.findMany({
      where: {
        userId,
        completedAt: { gte: startOfWeek() },
      },
      select: { minutesSpent: true },
    }),
  ]);

  return {
    lessonsCompleted: allProgress.length,
    stars: allProgress.reduce((s, p) => s + p.stars, 0),
    minutesThisWeek: weekProgress.reduce((s, p) => s + p.minutesSpent, 0),
  };
}

/** Public Moajam Kids course catalog + lessons */
export const kidsController = {
  listModules: async (req: Request, res: Response): Promise<Response> => {
    try {
      const modules = await prisma.kidsModule.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      });

      const progress = req.userId ? await progressByModule(req.userId) : null;

      return successResponse(
        res,
        modules.map((m) => {
          const p = progress?.get(m.id);
          if (p) {
            return mapModule({
              ...m,
              progress: 100,
              stars: Math.min(3, Math.max(0, p.stars)),
            });
          }
          return mapModule({ ...m, progress: 0, stars: 0 });
        })
      );
    } catch (error) {
      console.error('List kids modules error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getModule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const mod = await prisma.kidsModule.findFirst({
        where: { id, isActive: true },
      });
      if (!mod) return errorResponse(res, 'Module not found', 404);

      const progress = req.userId ? await progressByModule(req.userId) : null;
      const p = progress?.get(mod.id);
      if (p) {
        return successResponse(
          res,
          mapModule({ ...mod, progress: 100, stars: Math.min(3, Math.max(0, p.stars)) })
        );
      }
      return successResponse(res, mapModule({ ...mod, progress: 0, stars: 0 }));
    } catch (error) {
      console.error('Get kids module error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getLesson: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const mod = await prisma.kidsModule.findFirst({
        where: { id, isActive: true },
        include: {
          screens: { orderBy: { orderIndex: 'asc' } },
        },
      });
      if (!mod) return errorResponse(res, 'Module not found', 404);

      const progress = req.userId ? await progressByModule(req.userId) : null;
      const p = progress?.get(mod.id);
      const moduleDto = p
        ? mapModule({ ...mod, progress: 100, stars: Math.min(3, Math.max(0, p.stars)) })
        : mapModule({ ...mod, progress: 0, stars: 0 });

      return successResponse(res, {
        module: moduleDto,
        screens: mod.screens.map(mapScreen),
      });
    } catch (error) {
      console.error('Get kids lesson error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  completeLesson: async (req: Request, res: Response): Promise<Response> => {
    try {
      const userId = req.userId!;
      const id = paramId(req);
      const mod = await prisma.kidsModule.findFirst({
        where: { id, isActive: true },
      });
      if (!mod) return errorResponse(res, 'Module not found', 404);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { accessKids: true },
      });
      if (!user?.accessKids) {
        return errorResponse(res, 'Kids access required', 403);
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const stars =
        typeof body.stars === 'number' ? Math.min(3, Math.max(0, Math.round(body.stars))) : 3;
      const minutesSpent =
        typeof body.minutesSpent === 'number'
          ? Math.min(120, Math.max(1, Math.round(body.minutesSpent)))
          : 8;

      const progress = await prisma.kidsModuleProgress.upsert({
        where: { userId_moduleId: { userId, moduleId: id } },
        create: { userId, moduleId: id, stars, minutesSpent },
        update: { stars, minutesSpent, completedAt: new Date() },
      });

      return successResponse(res, {
        moduleId: id,
        stars: progress.stars,
        minutesSpent: progress.minutesSpent,
        completedAt: progress.completedAt,
        progress: 100,
      });
    } catch (error) {
      console.error('Complete kids lesson error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  /**
   * Parent dashboard: children whose parentEmail matches the logged-in user.
   * Also returns the caller's own profile if they have kids access (self view).
   */
  parentReport: async (req: Request, res: Response): Promise<Response> => {
    try {
      const parentUserId = req.userId!;
      const me = await prisma.user.findUnique({
        where: { id: parentUserId },
        select: { id: true, email: true, name: true },
      });
      if (!me) return errorResponse(res, 'User not found', 404);

      const children = await prisma.user.findMany({
        where: {
          OR: [{ parentEmail: me.email }, { id: me.id, accessKids: true }],
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          accessKids: true,
          parentEmail: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });

      const seen = new Set<string>();
      const unique = children.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      const moduleCount = await prisma.kidsModule.count({ where: { isActive: true } });

      const reportChildren = await Promise.all(
        unique.map(async (c) => {
          const stats = await aggregateChildStats(c.id);
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            avatar: c.avatarUrl || '🧒',
            isSelf: c.id === me.id,
            lessonsCompleted: stats.lessonsCompleted,
            stars: stats.stars,
            minutesThisWeek: stats.minutesThisWeek,
            moduleCount,
          };
        })
      );

      return successResponse(res, {
        parent: { id: me.id, email: me.email, name: me.name },
        children: reportChildren,
        weekKey: weekKeyFromDate(),
      });
    } catch (error) {
      console.error('Kids parent report error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  /** On-demand TTS for kids lesson vocabulary (Deepgram / OpenRouter Gemini; cached in memory). */
  getWordAudio: async (req: Request, res: Response): Promise<Response | void> => {
    try {
      const rawText = typeof req.query.text === 'string' ? req.query.text.trim() : '';
      const lang = req.query.lang === 'ar' ? 'ar' : 'en';

      if (!rawText) {
        return errorResponse(res, 'text query parameter is required', 400);
      }
      if (rawText.length > 120) {
        return errorResponse(res, 'text too long', 400);
      }

      const cacheKey = kidsAudioCacheKey(rawText, lang);
      let cached = kidsAudioCache.get(cacheKey);

      if (!cached) {
        const usageUserId = await resolveUsageUserId(req.userId);
        const result = await textToSpeechForKids(rawText, lang, usageUserId);
        cached = { buffer: result.buffer, contentType: result.contentType };
        cacheKidsAudio(cacheKey, cached);
      }

      sendAudioWithRangeSupport(req, res, cached.buffer, cached.contentType);
    } catch (error: any) {
      console.error('Kids word audio error:', error);
      const isArabicUnsupported =
        error?.name === 'ArabicTtsUnsupportedError' ||
        error?.message?.includes('Arabic TTS unavailable');
      if (isArabicUnsupported) {
        return errorResponse(res, 'Arabic TTS unavailable — use browser speech', 503);
      }
      return errorResponse(res, error?.message?.includes('TTS') ? 'TTS unavailable' : 'Server error', 503);
    }
  },
};

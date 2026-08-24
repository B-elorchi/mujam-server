import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

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

function mapModule(m: {
  id: string;
  titleEn: string;
  titleAr: string;
  icon: string;
  color: string;
  progress: number;
  stars: number;
}) {
  return {
    id: m.id,
    titleEn: m.titleEn,
    titleAr: m.titleAr,
    icon: m.icon,
    color: m.color,
    progress: m.progress,
    stars: m.stars,
  };
}

function paramId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Public Moajam Kids course catalog + lessons */
export const kidsController = {
  listModules: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const modules = await prisma.kidsModule.findMany({
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
      });
      return successResponse(res, modules.map(mapModule));
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
      return successResponse(res, mapModule(mod));
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

      return successResponse(res, {
        module: mapModule(mod),
        screens: mod.screens.map(mapScreen),
      });
    } catch (error) {
      console.error('Get kids lesson error:', error);
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
          OR: [
            { parentEmail: me.email },
            { id: me.id, accessKids: true },
          ],
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

      // Deduplicate if parent is also a kids user linked to self
      const seen = new Set<string>();
      const unique = children.filter((c) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      const moduleCount = await prisma.kidsModule.count({ where: { isActive: true } });

      const reportChildren = unique.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        avatar: c.avatarUrl || '🧒',
        isSelf: c.id === me.id,
        // Progress fields until per-child lesson tracking exists
        lessonsCompleted: 0,
        stars: 0,
        minutesThisWeek: 0,
        moduleCount,
      }));

      return successResponse(res, {
        parent: { id: me.id, email: me.email, name: me.name },
        children: reportChildren,
        weekKey: (() => {
          const d = new Date();
          const onejan = new Date(d.getFullYear(), 0, 1);
          const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
          return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
        })(),
      });
    } catch (error) {
      console.error('Kids parent report error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

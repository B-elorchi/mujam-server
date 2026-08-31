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

      if (!req.userId) {
        return successResponse(res, modules.map(mapModule));
      }

      const progress = await progressByModule(req.userId);

      return successResponse(
        res,
        modules.map((m) => {
          const p = progress.get(m.id);
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

      if (!req.userId) {
        return successResponse(res, mapModule(mod));
      }

      const progress = await progressByModule(req.userId);
      const p = progress.get(mod.id);
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

      let moduleDto = mapModule(mod);
      if (req.userId) {
        const progress = await progressByModule(req.userId);
        const p = progress.get(mod.id);
        if (p) {
          moduleDto = mapModule({ ...mod, progress: 100, stars: Math.min(3, Math.max(0, p.stars)) });
        } else {
          moduleDto = mapModule({ ...mod, progress: 0, stars: 0 });
        }
      }

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
};

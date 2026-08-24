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
};

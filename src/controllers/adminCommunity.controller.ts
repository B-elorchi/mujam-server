import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/apiResponse';
import * as svc from '../services/community.service';

export const adminCommunityController = {
  getRooms: async (_req: Request, res: Response): Promise<Response> => {
    try {
      return successResponse(res, await svc.adminGetRooms());
    } catch {
      return errorResponse(res, 'فشل تحميل الغرف', 500);
    }
  },

  createRoom: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { name, nameAr, description, icon, isDefault } = req.body;
      if (!name || !nameAr) return errorResponse(res, 'الاسم مطلوب', 400);
      const room = await svc.adminCreateRoom({ name, nameAr, description, icon, isDefault });
      return successResponse(res, room, 'تم إنشاء الغرفة', 201);
    } catch {
      return errorResponse(res, 'فشل إنشاء الغرفة', 500);
    }
  },

  updateRoom: async (req: Request, res: Response): Promise<Response> => {
    try {
      const room = await svc.adminUpdateRoom(req.params.id as string, req.body);
      return successResponse(res, room);
    } catch {
      return errorResponse(res, 'فشل تحديث الغرفة', 500);
    }
  },

  getMembers: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { status } = req.query as { status?: string };
      return successResponse(res, await svc.adminGetMembers(status));
    } catch {
      return errorResponse(res, 'فشل تحميل الأعضاء', 500);
    }
  },

  updateMember: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { status } = req.body;
      if (!['ACTIVE', 'PENDING', 'BANNED'].includes(status))
        return errorResponse(res, 'حالة غير صالحة', 400);
      const m = await svc.adminUpdateMember(req.params.id as string, status);
      return successResponse(res, m);
    } catch {
      return errorResponse(res, 'فشل تحديث العضو', 500);
    }
  },

  deleteMessage: async (req: Request, res: Response): Promise<Response> => {
    try {
      await svc.adminDeleteMessage(req.params.id as string);
      return successResponse(res, null, 'تم حذف الرسالة');
    } catch {
      return errorResponse(res, 'فشل حذف الرسالة', 500);
    }
  },

  getSettings: async (_req: Request, res: Response): Promise<Response> => {
    try {
      return successResponse(res, await svc.adminGetSettings());
    } catch {
      return errorResponse(res, 'فشل تحميل الإعدادات', 500);
    }
  },

  updateSettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { communityAutoAccept } = req.body;
      if (typeof communityAutoAccept !== 'boolean')
        return errorResponse(res, 'قيمة غير صالحة', 400);
      const s = await svc.adminUpdateSettings(communityAutoAccept);
      return successResponse(res, s);
    } catch {
      return errorResponse(res, 'فشل تحديث الإعدادات', 500);
    }
  },
};

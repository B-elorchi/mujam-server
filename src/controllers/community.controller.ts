import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { uploadFile } from '../services/storage';
import * as svc from '../services/community.service';
import { v4 as uuidv4 } from 'uuid';

export const communityController = {
  getStatus: async (req: Request, res: Response): Promise<Response> => {
    try {
      const result = await svc.getCommunityStatus(req.userId!);
      return successResponse(res, result);
    } catch (e) {
      return errorResponse(res, 'فشل تحميل حالة المجتمع', 500);
    }
  },

  join: async (req: Request, res: Response): Promise<Response> => {
    try {
      const existing = await svc.getCommunityStatus(req.userId!);
      if (existing.isMember) {
        return errorResponse(res, 'أنت عضو بالفعل في المجتمع', 400);
      }
      if (existing.isPending) {
        return errorResponse(res, 'طلبك قيد المراجعة', 400);
      }
      const result = await svc.joinCommunity(req.userId!);
      return successResponse(res, result, 'تم الانضمام إلى المجتمع بنجاح', 201);
    } catch (e) {
      return errorResponse(res, 'فشل الانضمام إلى المجتمع', 500);
    }
  },

  getRooms: async (req: Request, res: Response): Promise<Response> => {
    try {
      const rooms = await svc.getActiveRooms(req.userId!);
      return successResponse(res, rooms);
    } catch (e) {
      return errorResponse(res, 'فشل تحميل الغرف', 500);
    }
  },

  getMessages: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
      const before = req.query.before as string | undefined;
      const messages = await svc.getRoomMessages(id, req.userId!, limit, before);
      return successResponse(res, messages);
    } catch (e: any) {
      if (e.message === 'NOT_MEMBER') return errorResponse(res, 'غير مصرح لك بالدخول', 403);
      return errorResponse(res, 'فشل تحميل الرسائل', 500);
    }
  },

  uploadAudio: async (req: Request, res: Response): Promise<Response> => {
    try {
      if (!req.file) return errorResponse(res, 'لم يتم إرفاق ملف صوتي', 400);
      const filename = `community/${uuidv4()}.webm`;
      const url = await uploadFile('audio-community', req.file.buffer, filename, req.file.mimetype);
      return successResponse(res, { audioUrl: url });
    } catch (e) {
      return errorResponse(res, 'فشل رفع الملف الصوتي', 500);
    }
  },

  getMembers: async (req: Request, res: Response): Promise<Response> => {
    try {
      const members = await svc.getActiveMembers(req.userId!);
      return successResponse(res, members);
    } catch {
      return errorResponse(res, 'فشل تحميل الأعضاء', 500);
    }
  },

  markRead: async (req: Request, res: Response): Promise<Response> => {
    try {
      await svc.markRoomRead(req.userId!, req.params.id);
      return successResponse(res, null);
    } catch {
      return errorResponse(res, 'فشل تحديث القراءة', 500);
    }
  },

  sendInvitation: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { toUserId } = req.body;
      if (!toUserId) return errorResponse(res, 'يجب تحديد المستخدم', 400);
      if (toUserId === req.userId) return errorResponse(res, 'لا يمكنك دعوة نفسك', 400);
      const inv = await svc.sendPracticeInvitation(req.userId!, toUserId);
      return successResponse(res, inv, 'تم إرسال الدعوة', 201);
    } catch (e: any) {
      if (e.message === 'ALREADY_INVITED') return errorResponse(res, 'لديك دعوة معلقة لهذا المستخدم بالفعل', 409);
      if (e.message?.startsWith('ALREADY_HAS_ROOM:')) {
        const roomId = e.message.split(':')[1];
        return res.status(409).json({ success: false, error: 'ALREADY_HAS_ROOM', roomId });
      }
      return errorResponse(res, 'فشل إرسال الدعوة', 500);
    }
  },

  getInvitations: async (req: Request, res: Response): Promise<Response> => {
    try {
      const invitations = await svc.getPracticeInvitations(req.userId!);
      return successResponse(res, invitations);
    } catch {
      return errorResponse(res, 'فشل تحميل الدعوات', 500);
    }
  },

  respondInvitation: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;
      const { accept } = req.body;
      const result = await svc.respondToInvitation(id, req.userId!, Boolean(accept));
      return successResponse(res, result);
    } catch (e: any) {
      if (e.message === 'NOT_FOUND') return errorResponse(res, 'الدعوة غير موجودة', 404);
      if (e.message === 'ALREADY_HANDLED') return errorResponse(res, 'تمت معالجة الدعوة مسبقاً', 400);
      return errorResponse(res, 'فشل الرد على الدعوة', 500);
    }
  },
};

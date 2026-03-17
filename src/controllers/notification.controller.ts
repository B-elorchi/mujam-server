import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';

export const notificationController = {
  getNotifications: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { page, limit, offset } = getPagination(req.query.page as string, req.query.limit as string);

      const [notifications, total] = await Promise.all([
        prisma.userNotification.findMany({
          where: { userId: req.userId },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit,
        }),
        prisma.userNotification.count({ where: { userId: req.userId } }),
      ]);

      return successResponse(res, {
        notifications,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  markRead: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params;

      await prisma.userNotification.updateMany({
        where: { id, userId: req.userId },
        data: { isRead: true },
      });

      return successResponse(res, null, 'Marked as read');
    } catch (error) {
      console.error('Mark read error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  markAllRead: async (req: Request, res: Response): Promise<Response> => {
    try {
      await prisma.userNotification.updateMany({
        where: { userId: req.userId, isRead: false },
        data: { isRead: true },
      });

      return successResponse(res, null, 'All marked as read');
    } catch (error) {
      console.error('Mark all read error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getUnreadCount: async (req: Request, res: Response): Promise<Response> => {
    try {
      const count = await prisma.userNotification.count({
        where: { userId: req.userId, isRead: false },
      });

      return successResponse(res, { count });
    } catch (error) {
      console.error('Get unread count error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  createNotification: async (
    userId: string,
    data: { title: string; body: string; type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'PROMO'; actionUrl?: string }
  ): Promise<void> => {
    await prisma.userNotification.create({
      data: {
        userId,
        title: data.title,
        body: data.body,
        type: data.type || 'INFO',
        actionUrl: data.actionUrl,
      },
    });
  },
};
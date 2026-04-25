import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import { createRedisSubscriber, isRedisEnabled } from '../config/redis';

function applySseCors(req: Request, res: Response): void {
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:8080')
    .split(',')
    .map((o) => o.trim());
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

export const notificationController = {
  stream: async (req: Request, res: Response): Promise<void> => {
    if (!isRedisEnabled()) {
      errorResponse(res, 'Real-time notifications require Redis', 503);
      return;
    }

    const sub = createRedisSubscriber();
    if (!sub) {
      errorResponse(res, 'Real-time notifications unavailable', 503);
      return;
    }

    const userId = req.userId!;
    applySseCors(req, res);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const channel = `mujam:notify:${userId}`;

    const send = (event: string, data: object) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const onMessage = (_ch: string, message: string) => {
      try {
        const payload = JSON.parse(message) as Record<string, unknown>;
        send('notification', payload);
      } catch (e) {
        console.error('SSE notification parse error:', e);
      }
    };

    sub.on('message', onMessage);

    try {
      await sub.subscribe(channel);
    } catch (e) {
      console.error('SSE subscribe error:', e);
      await sub.quit();
      if (!res.headersSent) {
        errorResponse(res, 'Failed to subscribe to notifications', 500);
      }
      return;
    }

    send('connected', { ok: true });

    const ping = setInterval(() => {
      send('ping', { t: Date.now() });
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      sub.off('message', onMessage);
      void sub.unsubscribe(channel).finally(() => sub.quit());
    });
  },

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
      const { id } = req.params as { id: string };

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
};
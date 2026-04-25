import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { sendEmail } from '../config/email';

export const adminBroadcastController = {
  getTargetUsers: async (target: string, targetConfig: any): Promise<{ id: string; email: string; name: string }[]> => {
    const where: any = { isActive: true };

    switch (target) {
      case 'FREE_USERS':
        where.plan = 'FREE';
        break;
      case 'PREMIUM_USERS':
        where.plan = 'PREMIUM';
        break;
      case 'BY_LEVEL':
        if (targetConfig?.levels) {
          where.currentLevel = { in: targetConfig.levels };
        }
        break;
      case 'INACTIVE':
        const days = targetConfig?.days || 30;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        where.lastActiveAt = { lt: cutoff };
        break;
    }

    const users = await prisma.user.findMany({ where, select: { id: true, email: true, name: true } });
    return users;
  },

  preview: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { target, targetConfig } = req.body;

      const users = await adminBroadcastController.getTargetUsers(target, targetConfig);

      return successResponse(res, { count: users.length, users: users.slice(0, 5) });
    } catch (error) {
      console.error('Preview error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  send: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { title, body, type, channel, target, targetConfig, actionUrl, icon, scheduledAt } = req.body;

      const users = await adminBroadcastController.getTargetUsers(target, targetConfig);

      const broadcast = await prisma.broadcastMessage.create({
        data: {
          title,
          body,
          type: type || 'INFO',
          channel: channel || 'IN_APP',
          target: target || 'ALL',
          targetConfig: targetConfig || {},
          actionUrl,
          icon,
          totalSent: users.length,
          sentAt: new Date(),
          createdBy: req.userId!,
        },
      });

      for (const user of users) {
        await prisma.userNotification.create({
          data: {
            userId: user.id,
            title,
            body,
            type: type || 'INFO',
            actionUrl,
          },
        });

        if (channel === 'EMAIL' || channel === 'ALL') {
          try {
            await sendEmail({
              to: user.email,
              subject: title,
              html: `<p>${body}</p>`,
            });
          } catch (e) {
            console.error('Email send failed:', e);
          }
        }
      }

      return successResponse(res, broadcast, `Sent to ${users.length} users`);
    } catch (error) {
      console.error('Send broadcast error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  schedule: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { title, body, type, channel, target, targetConfig, actionUrl, icon, scheduledAt } = req.body;

      if (!scheduledAt) {
        return errorResponse(res, 'Scheduled time is required', 400);
      }

      const broadcast = await prisma.broadcastMessage.create({
        data: {
          title,
          body,
          type: type || 'INFO',
          channel: channel || 'IN_APP',
          target: target || 'ALL',
          targetConfig: targetConfig || {},
          actionUrl,
          icon,
          scheduledAt: new Date(scheduledAt),
          createdBy: req.userId!,
        },
      });

      return successResponse(res, broadcast, 'Broadcast scheduled');
    } catch (error) {
      console.error('Schedule broadcast error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getHistory: async (req: Request, res: Response): Promise<Response> => {
    try {
      const broadcasts = await prisma.broadcastMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      return successResponse(res, broadcasts);
    } catch (error) {
      console.error('Get history error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';

export const adminUserController = {
  getUsers: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { page, limit, offset } = getPagination(req.query.page as string, req.query.limit as string);
      const { search, plan, level, active } = req.query;

      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }
      if (plan) where.plan = plan;
      if (level) where.currentLevel = parseInt(level as string);
      if (active !== undefined) where.isActive = active === 'true';

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
            plan: true,
            currentLevel: true,
            isActive: true,
            emailVerified: true,
            createdAt: true,
            lastActiveAt: true,
          },
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      return successResponse(res, {
        users,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Get users error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getUser: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          subscription: true,
          streak: true,
          _count: {
            select: {
              sentenceProgress: { where: { completed: true } },
              gameProgress: { where: { completed: true } },
              aiSessions: true,
              achievements: true,
              levelCompletion: true,
            },
          },
          levelCompletion: true,
        },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      return successResponse(res, user);
    } catch (error) {
      console.error('Get user error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateUser: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { role, plan, currentLevel } = req.body;

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(role && { role }),
          ...(plan && { plan }),
          ...(currentLevel && { currentLevel: parseInt(currentLevel) }),
        },
        select: { id: true, name: true, email: true, role: true, plan: true, currentLevel: true },
      });

      return successResponse(res, user, 'User updated');
    } catch (error) {
      console.error('Update user error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  suspendUser: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      await prisma.$transaction([
        prisma.user.update({ where: { id }, data: { isActive: false } }),
        prisma.refreshToken.updateMany({ where: { userId: id }, data: { isRevoked: true } }),
      ]);

      return successResponse(res, null, 'User suspended');
    } catch (error) {
      console.error('Suspend user error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  unsuspendUser: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };

      await prisma.user.update({
        where: { id },
        data: { isActive: true },
      });

      return successResponse(res, null, 'User unsuspended');
    } catch (error) {
      console.error('Unsuspend user error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getSubscriptions: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { page, limit, offset } = getPagination(req.query.page as string, req.query.limit as string);

      const [subscriptions, total, stats] = await Promise.all([
        prisma.subscription.findMany({
          skip: offset,
          take: limit,
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.subscription.count(),
        Promise.all([
          prisma.subscription.findMany({
            where: { isActive: true },
            select: { priceMonthly: true },
          }),
          prisma.subscription.count({ where: { isActive: true } }),
          prisma.subscription.count({ where: { isActive: false } }),
          prisma.subscription.count({
            where: {
              isActive: true,
              trialEndsAt: { gt: new Date() },
            },
          }),
        ]).then(([activeRows, activeCount, cancelledCount, trialCount]) => ({
          mrr: activeRows.reduce((sum, s) => sum + s.priceMonthly, 0),
          activeCount,
          cancelledCount,
          trialCount,
        })),
      ]);

      return successResponse(res, {
        subscriptions,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        stats,
      });
    } catch (error) {
      console.error('Get subscriptions error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getCertificates: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const certificates = await prisma.certificate.findMany({
        orderBy: { issuedAt: 'desc' },
        take: 200,
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      return successResponse(res, { certificates });
    } catch (error) {
      console.error('Get certificates error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getTeam: async (req: Request, res: Response): Promise<Response> => {
    try {
      const team = await prisma.user.findMany({
        where: { role: { not: 'STUDENT' } },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      return successResponse(res, team);
    } catch (error) {
      console.error('Get team error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  inviteTeamMember: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { email, role } = req.body;

      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.adminInvitation.create({
        data: { email, role, token, expiresAt, createdBy: req.userId! },
      });

      return successResponse(res, { invitationLink: `${process.env.FRONTEND_URL}/join?token=${token}` }, 'Invitation sent');
    } catch (error) {
      console.error('Invite team member error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateTeamRole: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { id } = req.params as { id: string };
      const { role } = req.body;

      await prisma.user.update({
        where: { id },
        data: { role },
      });

      return successResponse(res, null, 'Role updated');
    } catch (error) {
      console.error('Update team role error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
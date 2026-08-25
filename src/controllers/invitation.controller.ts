import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { sendInvitationEmail, sendParentProgressInviteEmail } from '../config/email';
import {
  createUserInvitation,
  findInvitationByRawToken,
  getInvitationStatus,
  invitationErrorMessage,
  normalizeInviteEmail,
  parseInviteAccess,
  publicInvitationView,
} from '../services/invitation.service';

function paramId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0] : raw;
}

export const invitationController = {
  /** Admin: create invite + send email */
  create: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const email = normalizeInviteEmail(req.body.email);
      const access = parseInviteAccess(req.body.access);
      if (!access) {
        return errorResponse(res, 'access must be MOAJAM, KIDS, or BOTH', 400);
      }

      const includesKids = access === 'KIDS' || access === 'BOTH';
      const parentEmailRaw =
        typeof req.body.parentEmail === 'string' ? req.body.parentEmail.trim() : '';
      if (parentEmailRaw && !includesKids) {
        return errorResponse(res, 'parentEmail is only allowed when access includes KIDS', 400);
      }

      const invitedById = req.userId!;

      let result;
      try {
        result = await createUserInvitation({
          email,
          invitedById,
          access,
          parentEmail: parentEmailRaw || null,
        });
      } catch (e: any) {
        if (e?.code === 'EMAIL_ALREADY_REGISTERED' || e?.message === 'EMAIL_ALREADY_REGISTERED') {
          return errorResponse(res, 'A user with this email already exists', 409);
        }
        if (e?.code === 'PARENT_EMAIL_SAME_AS_LEARNER') {
          return errorResponse(res, 'Parent email must differ from the learner email', 400);
        }
        throw e;
      }

      try {
        await sendInvitationEmail(
          email,
          result.invitationLink,
          result.invitation.expiresAt,
          access
        );
      } catch (emailError) {
        console.error('Invitation email failed:', emailError);
      }

      if (result.invitation.parentEmail) {
        try {
          await sendParentProgressInviteEmail(result.invitation.parentEmail, email);
        } catch (parentErr) {
          console.error('Parent invite email failed:', parentErr);
        }
      }

      return successResponse(
        res,
        {
          id: result.invitation.id,
          email: result.invitation.email,
          access: result.invitation.access,
          parentEmail: result.invitation.parentEmail,
          expiresAt: result.invitation.expiresAt,
          invitationLink: result.invitationLink,
        },
        'Invitation created'
      );
    } catch (error) {
      console.error('Create invitation error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  /** Admin: list invitations (no token hashes exposed) */
  list: async (_req: Request, res: Response): Promise<Response> => {
    try {
      const items = await prisma.userInvitation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          email: true,
          access: true,
          parentEmail: true,
          expiresAt: true,
          usedAt: true,
          revokedAt: true,
          createdAt: true,
          invitedBy: { select: { id: true, name: true, email: true } },
        },
      });

      const data = items.map((i) => ({
        id: i.id,
        email: i.email,
        access: i.access,
        parentEmail: i.parentEmail,
        expiresAt: i.expiresAt,
        usedAt: i.usedAt,
        revokedAt: i.revokedAt,
        createdAt: i.createdAt,
        invitedBy: i.invitedBy,
        status: i.revokedAt
          ? 'revoked'
          : i.usedAt
            ? 'used'
            : i.expiresAt.getTime() <= Date.now()
              ? 'expired'
              : 'pending',
      }));

      return successResponse(res, data);
    } catch (error) {
      console.error('List invitations error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  /** Admin: revoke pending invitation */
  revoke: async (req: Request, res: Response): Promise<Response> => {
    try {
      const id = paramId(req);
      const invitation = await prisma.userInvitation.findUnique({ where: { id } });
      if (!invitation) return errorResponse(res, 'Invitation not found', 404);
      if (invitation.usedAt) return errorResponse(res, 'Invitation already used', 400);
      if (invitation.revokedAt) return errorResponse(res, 'Invitation already revoked', 400);

      await prisma.userInvitation.update({
        where: { id },
        data: { revokedAt: new Date() },
      });

      return successResponse(res, null, 'Invitation revoked');
    } catch (error) {
      console.error('Revoke invitation error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  /** Public: preview invite for register form (email + expiry only) */
  preview: async (req: Request, res: Response): Promise<Response> => {
    try {
      const token = typeof req.query.token === 'string' ? req.query.token : '';
      if (!token) {
        return errorResponse(res, invitationErrorMessage('MISSING_TOKEN'), 400);
      }

      const invitation = await findInvitationByRawToken(token);
      const status = getInvitationStatus(invitation);
      if (status.ok === false) {
        return errorResponse(res, invitationErrorMessage(status.code), 400);
      }

      return successResponse(res, publicInvitationView(status.invitation));
    } catch (error) {
      console.error('Preview invitation error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { hashPassword, verifyPassword, generateRandomCode, generateRandomToken } from '../utils/hash';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../config/email';
import { recordLogin } from '../services/sessionTracking.service';
import {
  accessFlagsFromInvite,
  findInvitationByRawToken,
  getInvitationStatus,
  invitationErrorMessage,
  normalizeInviteEmail,
} from '../services/invitation.service';
import { sendParentProgressInviteEmail } from '../config/email';
import { isPublicSignupAllowed, publicSignupAccessFlags } from '../utils/publicSignup';

export const authController = {
  /** Public: whether open registration is enabled (for UI CTAs). */
  registrationOptions: async (_req: Request, res: Response): Promise<Response> => {
    res.setHeader('Cache-Control', 'no-store');
    return successResponse(res, { publicSignup: isPublicSignupAllowed() });
  },

  register: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { name, email, password, currentLevel, placementScore, invitationToken, signupSpace } =
        req.body;
      const rawInvite =
        typeof invitationToken === 'string' && invitationToken.trim()
          ? invitationToken.trim()
          : '';

      // ── Public signup (no invite) when ALLOW_PUBLIC_SIGNUP=true ────────────
      if (!rawInvite) {
        if (!isPublicSignupAllowed()) {
          return errorResponse(res, invitationErrorMessage('MISSING_TOKEN'), 400);
        }

        const registeredEmail = normalizeInviteEmail(email);
        const existingUser = await prisma.user.findUnique({ where: { email: registeredEmail } });
        if (existingUser) {
          return errorResponse(res, 'Email already registered', 400);
        }

        const passwordHash = await hashPassword(password);
        const verificationCode = generateRandomCode(6);
        const access = publicSignupAccessFlags(
          typeof signupSpace === 'string' ? signupSpace : undefined
        );

        const user = await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: {
              name,
              email: registeredEmail,
              passwordHash,
              role: 'STUDENT',
              plan: 'FREE',
              currentLevel: currentLevel || 0,
              placementScore: placementScore || 0,
              emailVerified: false,
              accessMoajam: access.accessMoajam,
              accessKids: access.accessKids,
            },
          });

          await tx.emailVerification.create({
            data: {
              email: registeredEmail,
              code: verificationCode,
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            },
          });

          await tx.userStreak.create({
            data: { userId: created.id },
          });

          return created;
        });

        try {
          await sendVerificationEmail(registeredEmail, verificationCode);
        } catch (emailError) {
          console.error('Email sending failed during public registration:', emailError);
        }

        const tokenPayload = { userId: user.id, email: user.email, role: user.role };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);

        await prisma.refreshToken.create({
          data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        return successResponse(
          res,
          {
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              plan: user.plan,
              role: user.role,
              emailVerified: user.emailVerified,
              accessMoajam: user.accessMoajam,
              accessKids: user.accessKids,
              parentEmail: user.parentEmail,
            },
            accessToken,
            refreshToken,
          },
          'Registration successful'
        );
      }

      // ── Invite-only path (default; always available when token present) ───
      const invitation = await findInvitationByRawToken(rawInvite);
      const inviteStatus = getInvitationStatus(invitation, new Date(), email);
      if (inviteStatus.ok === false) {
        return errorResponse(res, invitationErrorMessage(inviteStatus.code), 400);
      }

      // Authoritative email from invitation (request email must match; we persist invite email)
      const registeredEmail = normalizeInviteEmail(inviteStatus.invitation.email);

      const existingUser = await prisma.user.findUnique({ where: { email: registeredEmail } });
      if (existingUser) {
        return errorResponse(res, 'Email already registered', 400);
      }

      const passwordHash = await hashPassword(password);
      const flags = accessFlagsFromInvite(inviteStatus.invitation.access as 'MOAJAM' | 'KIDS' | 'BOTH');
      const parentEmail = inviteStatus.invitation.parentEmail
        ? normalizeInviteEmail(inviteStatus.invitation.parentEmail)
        : null;

      let user;
      try {
        user = await prisma.$transaction(async (tx) => {
          const fresh = await tx.userInvitation.findUnique({
            where: { id: inviteStatus.invitation.id },
          });
          const again = getInvitationStatus(fresh, new Date(), registeredEmail);
          if (again.ok === false) {
            const err = new Error(again.code) as Error & { inviteCode: string };
            err.inviteCode = again.code;
            throw err;
          }

          // Invite already proves email ownership — mark verified and skip verification email
          const created = await tx.user.create({
            data: {
              name,
              email: registeredEmail,
              passwordHash,
              role: 'STUDENT',
              plan: 'FREE',
              currentLevel: currentLevel || 0,
              placementScore: placementScore || 0,
              emailVerified: true,
              accessMoajam: flags.accessMoajam,
              accessKids: flags.accessKids,
              parentEmail: flags.accessKids ? parentEmail : null,
            },
          });

          await tx.userInvitation.update({
            where: { id: inviteStatus.invitation.id },
            data: { usedAt: new Date() },
          });

          await tx.userStreak.create({
            data: { userId: created.id },
          });

          return created;
        });
      } catch (txError: any) {
        if (txError?.inviteCode) {
          return errorResponse(res, invitationErrorMessage(txError.inviteCode), 400);
        }
        throw txError;
      }

      if (user.parentEmail) {
        try {
          await sendParentProgressInviteEmail(user.parentEmail, registeredEmail, user.name);
        } catch (parentErr) {
          console.error('Parent progress email failed:', parentErr);
        }
      }

      const tokenPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return successResponse(
        res,
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            plan: user.plan,
            role: user.role,
            emailVerified: user.emailVerified,
            accessMoajam: user.accessMoajam,
            accessKids: user.accessKids,
            parentEmail: user.parentEmail,
          },
          accessToken,
          refreshToken,
        },
        'Registration successful'
      );
    } catch (error) {
      console.error('Register error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  login: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      if (!user.isActive) {
        return errorResponse(res, 'Account is suspended', 401);
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return errorResponse(res, 'Invalid credentials', 401);
      }

      await recordLogin(user.id);

      const tokenPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return successResponse(
        res,
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
            role: user.role,
            plan: user.plan,
            currentLevel: user.currentLevel,
            emailVerified: user.emailVerified,
            accessMoajam: user.accessMoajam,
            accessKids: user.accessKids,
            parentEmail: user.parentEmail,
          },
          accessToken,
          refreshToken,
        },
        'Login successful'
      );
    } catch (error) {
      console.error('Login error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  logout: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await prisma.refreshToken.updateMany({
          where: { token: refreshToken, userId: req.userId },
          data: { isRevoked: true },
        });
      }

      return successResponse(res, null, 'Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  refresh: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { refreshToken } = req.body;

      const tokenRecord = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord || tokenRecord.isRevoked) {
        return errorResponse(res, 'Invalid refresh token', 401);
      }

      if (tokenRecord.expiresAt < new Date()) {
        return errorResponse(res, 'Refresh token expired', 401);
      }

      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { isRevoked: true },
      });

      const tokenPayload = {
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
      };

      const newAccessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: tokenRecord.user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return successResponse(
        res,
        { accessToken: newAccessToken, refreshToken: newRefreshToken },
        'Token refreshed'
      );
    } catch (error) {
      console.error('Refresh error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  verifyEmail: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { email, code } = req.body;

      const verification = await prisma.emailVerification.findFirst({
        where: { email, code, used: false },
        orderBy: { createdAt: 'desc' },
      });

      if (!verification) {
        return errorResponse(res, 'الرمز غير صحيح أو منتهي الصلاحية', 400);
      }

      if (verification.expiresAt < new Date()) {
        return errorResponse(res, 'انتهت صلاحية رمز التحقق', 400);
      }

      await prisma.$transaction([
        prisma.emailVerification.update({
          where: { id: verification.id },
          data: { used: true },
        }),
        prisma.user.update({
          where: { email },
          data: { emailVerified: true },
        }),
      ]);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return errorResponse(res, 'المستخدم غير موجود', 404);
      }

      // Send welcome email (non-blocking)
      sendWelcomeEmail(email, user.name).catch(err =>
        console.error('Failed to send welcome email:', err)
      );

      // Generate tokens for the user
      const tokenPayload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return successResponse(
        res,
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            plan: user.plan,
            currentLevel: user.currentLevel,
            emailVerified: true,
          },
          accessToken,
          refreshToken,
        },
        'تم التحقق من البريد الإلكتروني بنجاح'
      );
    } catch (error) {
      console.error('Verify email error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  resendVerification: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return errorResponse(res, 'Email not found', 404);
      }

      if (user.emailVerified) {
        return errorResponse(res, 'Email already verified', 400);
      }

      const verificationCode = generateRandomCode(6);

      await prisma.emailVerification.create({
        data: {
          email,
          code: verificationCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      await sendVerificationEmail(email, verificationCode);

      return successResponse(res, null, 'Verification code sent');
    } catch (error) {
      console.error('Resend verification error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  forgotPassword: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return successResponse(res, null, 'If email exists, reset link will be sent');
      }

      const resetToken = generateRandomToken(32);

      await prisma.passwordReset.create({
        data: {
          email,
          token: resetToken,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Use first frontend URL if multiple are configured
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8080').split(',')[0].trim();
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      try {
        await sendPasswordResetEmail(email, resetLink);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't fail the request if email fails - token is already saved
        // In production, you might want to queue this for retry
      }

      return successResponse(res, null, 'If email exists, reset link will be sent');
    } catch (error) {
      console.error('Forgot password error:', error);
      return errorResponse(res, 'خطأ في الخادم', 500);
    }
  },

  resetPassword: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { token, password } = req.body;

      const passwordReset = await prisma.passwordReset.findUnique({
        where: { token },
      });

      if (!passwordReset) {
        return errorResponse(res, 'Invalid reset token', 400);
      }

      if (passwordReset.expiresAt < new Date()) {
        return errorResponse(res, 'Reset token expired', 400);
      }

      if (passwordReset.used) {
        return errorResponse(res, 'Token already used', 400);
      }

      const passwordHash = await hashPassword(password);

      await prisma.$transaction([
        prisma.passwordReset.update({
          where: { id: passwordReset.id },
          data: { used: true },
        }),
        prisma.user.update({
          where: { email: passwordReset.email },
          data: { passwordHash },
        }),
        prisma.refreshToken.updateMany({
          where: { user: { email: passwordReset.email } },
          data: { isRevoked: true },
        }),
      ]);

      return successResponse(res, null, 'Password reset successful');
    } catch (error) {
      console.error('Reset password error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  me: async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          plan: true,
          currentLevel: true,
          emailVerified: true,
          createdAt: true,
          accessMoajam: true,
          accessKids: true,
          parentEmail: true,
        },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      return successResponse(res, user);
    } catch (error) {
      console.error('Me error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};

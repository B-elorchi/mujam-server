import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { hashPassword, verifyPassword, generateRandomCode, generateRandomToken } from '../utils/hash';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../config/email';
import { recordLogin } from '../services/sessionTracking.service';

export const authController = {
  register: async (req: Request, res: Response): Promise<Response> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, errors.array()[0].msg, 400);
      }

      const { name, email, password, currentLevel, placementScore } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return errorResponse(res, 'Email already registered', 400);
      }

      const passwordHash = await hashPassword(password);
      const verificationCode = generateRandomCode(6);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: 'STUDENT',
          plan: 'FREE',
          currentLevel: currentLevel || 0,
          placementScore: placementScore || 0,
        },
      });

      await prisma.emailVerification.create({
        data: {
          email,
          code: verificationCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      try {
        await sendVerificationEmail(email, verificationCode);
      } catch (emailError) {
        console.error('Email sending failed during registration:', emailError);
        // We still created the user, but they can't verify yet. 
        // Or we could delete the user and return 500. 
        // Given the current flow, it's better to tell the user that registration worked but email failed.
        // However, the frontend expects a successful user object or an error.
        // Let's return a 500 but with a specific message so the user knows what happened.
        return errorResponse(res, 'Registration successful, but failed to send verification email. Please try resending it from login.', 500);
      }

      await prisma.userStreak.create({
        data: { userId: user.id },
      });

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
          user: { id: user.id, name: user.name, email: user.email, plan: user.plan, role: user.role },
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

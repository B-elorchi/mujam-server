import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { generateRandomToken } from '../utils/hash';

export const certificateController = {
  generate: async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          levelCompletion: { where: { completed: true } },
          _count: { select: { aiSessions: true } },
        },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const completedLevels = user.levelCompletion.filter((lc) => lc.completed).length;
      const shadowingDone = user.levelCompletion.some((lc) => lc.shadowingDone);
      const aiSessions = user._count.aiSessions;

      if (completedLevels < 7) {
        return errorResponse(res, 'You must complete all 7 levels to get a certificate', 400);
      }

      if (!shadowingDone) {
        return errorResponse(res, 'You must complete all shadowing exercises', 400);
      }

      if (aiSessions < 5) {
        return errorResponse(res, 'You must have at least 5 AI sessions', 400);
      }

      const existingCert = await prisma.certificate.findUnique({
        where: { userId: req.userId },
      });

      if (existingCert) {
        return successResponse(res, {
          verifyCode: existingCert.verifyCode,
          pdfUrl: existingCert.pdfUrl,
          issuedAt: existingCert.issuedAt,
        }, 'Certificate already generated');
      }

      const verifyCode = generateRandomToken(8).toUpperCase();

      const certificate = await prisma.certificate.create({
        data: {
          userId: req.userId!,
          verifyCode,
        },
      });

      return successResponse(res, {
        verifyCode: certificate.verifyCode,
        issuedAt: certificate.issuedAt,
      }, 'Certificate generated');
    } catch (error) {
      console.error('Generate certificate error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getCertificate: async (req: Request, res: Response): Promise<Response> => {
    try {
      const certificate = await prisma.certificate.findUnique({
        where: { userId: req.userId },
      });

      if (!certificate) {
        return successResponse(res, { hasCertificate: false });
      }

      return successResponse(res, {
        hasCertificate: true,
        verifyCode: certificate.verifyCode,
        pdfUrl: certificate.pdfUrl,
        issuedAt: certificate.issuedAt,
      });
    } catch (error) {
      console.error('Get certificate error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  verify: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { code } = req.params;

      const certificate = await prisma.certificate.findUnique({
        where: { verifyCode: code },
        include: { user: { select: { name: true } } },
      });

      if (!certificate) {
        return errorResponse(res, 'Invalid certificate code', 404);
      }

      return successResponse(res, {
        valid: true,
        studentName: certificate.user.name,
        issuedAt: certificate.issuedAt,
      });
    } catch (error) {
      console.error('Verify certificate error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
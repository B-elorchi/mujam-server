import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { sendSubscriptionConfirmation } from '../config/email';

export const subscriptionController = {
  getSubscription: async (req: Request, res: Response): Promise<Response> => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.userId },
      });

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true },
      });

      return successResponse(res, {
        plan: user?.plan || 'FREE',
        subscription: subscription || null,
      });
    } catch (error) {
      console.error('Get subscription error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  subscribe: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { plan, paymentMethodId } = req.body;

      if (plan !== 'PREMIUM') {
        return errorResponse(res, 'Invalid plan', 400);
      }

      const settings = await prisma.platformSettings.findFirst();
      const price = settings?.premiumMonthlyPrice || 9.99;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const trialDays = settings?.trialDays || 7;
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

      const subscription = await prisma.subscription.upsert({
        where: { userId: req.userId },
        update: {
          plan: 'PREMIUM',
          priceMonthly: price,
          startDate,
          endDate,
          trialEndsAt,
          isActive: true,
          cancelledAt: null,
          paymentReference: paymentMethodId,
        },
        create: {
          userId: req.userId!,
          plan: 'PREMIUM',
          priceMonthly: price,
          startDate,
          endDate,
          trialEndsAt,
          isActive: true,
          paymentReference: paymentMethodId,
        },
      });

      await prisma.user.update({
        where: { id: req.userId },
        data: { plan: 'PREMIUM' },
      });

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { email: true },
      });

      if (user?.email) {
        try {
          await sendSubscriptionConfirmation(user.email, 'PREMIUM');
        } catch (e) {
          console.error('Email sending failed:', e);
        }
      }

      return successResponse(res, subscription, 'Subscription activated');
    } catch (error) {
      console.error('Subscribe error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  cancel: async (req: Request, res: Response): Promise<Response> => {
    try {
      await prisma.subscription.update({
        where: { userId: req.userId },
        data: {
          isActive: false,
          cancelledAt: new Date(),
        },
      });

      return successResponse(res, null, 'Subscription cancelled');
    } catch (error) {
      console.error('Cancel error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
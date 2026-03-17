import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { generateRandomToken } from '../utils/hash';

export const referralController = {
  getMyCode: async (req: Request, res: Response): Promise<Response> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { referralsMade: true },
      });

      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      let referralCode = user.referralsMade[0]?.referrerId;

      if (!referralCode) {
        const existingUser = await prisma.user.findFirst({
          where: { referralsMade: { some: { referredId: req.userId } } },
        });
        referralCode = existingUser?.id;
      }

      const code = referralCode ? referralCode.substring(0, 8).toUpperCase() : null;

      return successResponse(res, { code });
    } catch (error) {
      console.error('Get my code error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  getStats: async (req: Request, res: Response): Promise<Response> => {
    try {
      const referrals = await prisma.referral.findMany({
        where: { referrerId: req.userId },
        include: { referred: { select: { name: true, createdAt: true, plan: true } } },
      });

      const referredCount = referrals.length;
      const rewardsEarned = referrals.filter((r) => r.rewardGiven).length;

      return successResponse(res, {
        referredCount,
        rewardsEarned,
        referrals: referrals.map((r) => ({
          name: r.referred.name,
          joinedAt: r.referred.createdAt,
          plan: r.referred.plan,
          rewardGiven: r.rewardGiven,
        })),
      });
    } catch (error) {
      console.error('Get stats error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  applyReferral: async (referredId: string, referrerId: string): Promise<void> => {
    const existing = await prisma.referral.findUnique({
      where: { referredId },
    });

    if (existing) return;

    await prisma.referral.create({
      data: { referrerId, referredId },
    });
  },

  giveReward: async (referrerId: string): Promise<void> => {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: referrerId },
    });

    if (subscription && subscription.isActive && subscription.endDate) {
      const newEndDate = new Date(subscription.endDate);
      newEndDate.setDate(newEndDate.getDate() + 30);

      await prisma.subscription.update({
        where: { userId: referrerId },
        data: { endDate: newEndDate },
      });

      await prisma.referral.updateMany({
        where: { referrerId, rewardGiven: false },
        data: { rewardGiven: true, rewardedAt: new Date() },
      });
    }
  },
};
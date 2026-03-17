import { Request, Response } from 'express';
import prisma from '../config/database';
import { successResponse, errorResponse } from '../utils/apiResponse';

export const adminSettingsController = {
  getSettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      let settings = await prisma.platformSettings.findFirst();

      if (!settings) {
        settings = await prisma.platformSettings.create({
          data: { id: 'singleton' },
        });
      }

      return successResponse(res, settings);
    } catch (error) {
      console.error('Get settings error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateSettings: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { platformName, supportEmail, freeAiLimit, freeLevelsCount, premiumMonthlyPrice, premiumYearlyPrice, trialDays } = req.body;

      const settings = await prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        update: {
          ...(platformName && { platformName }),
          ...(supportEmail && { supportEmail }),
          ...(freeAiLimit && { freeAiLimit: parseInt(freeAiLimit) }),
          ...(freeLevelsCount && { freeLevelsCount: parseInt(freeLevelsCount) }),
          ...(premiumMonthlyPrice && { premiumMonthlyPrice: parseFloat(premiumMonthlyPrice) }),
          ...(premiumYearlyPrice && { premiumYearlyPrice: parseFloat(premiumYearlyPrice) }),
          ...(trialDays && { trialDays: parseInt(trialDays) }),
        },
        create: {
          id: 'singleton',
          platformName: platformName || 'معجَم',
          supportEmail: supportEmail || 'support@mujam.com',
          freeAiLimit: freeAiLimit || 3,
          freeLevelsCount: freeLevelsCount || 2,
          premiumMonthlyPrice: premiumMonthlyPrice || 9.99,
          premiumYearlyPrice: premiumYearlyPrice || 7.99,
          trialDays: trialDays || 7,
        },
      });

      return successResponse(res, settings, 'Settings updated');
    } catch (error) {
      console.error('Update settings error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  toggleMaintenance: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { enabled, message } = req.body;

      const settings = await prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        update: {
          maintenanceMode: enabled,
          maintenanceMessage: message || null,
        },
        create: {
          id: 'singleton',
          maintenanceMode: enabled,
          maintenanceMessage: message,
        },
      });

      return successResponse(res, { maintenanceMode: settings.maintenanceMode }, 'Maintenance mode updated');
    } catch (error) {
      console.error('Toggle maintenance error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },

  updateFeatureFlags: async (req: Request, res: Response): Promise<Response> => {
    try {
      const { flags } = req.body;

      const settings = await prisma.platformSettings.findFirst();
      const currentFlags = (settings?.featureFlags as Record<string, boolean>) || {};
      const updatedFlags = { ...currentFlags, ...flags };

      await prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        update: { featureFlags: updatedFlags as any },
        create: { id: 'singleton', featureFlags: updatedFlags as any },
      });

      return successResponse(res, { featureFlags: updatedFlags }, 'Feature flags updated');
    } catch (error) {
      console.error('Update feature flags error:', error);
      return errorResponse(res, 'Server error', 500);
    }
  },
};
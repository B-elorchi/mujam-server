import prisma from '../config/database';
import { getNotificationQueue } from '../queues/notifications.queue';
import { persistUserNotificationAndPublish } from './notification.persistence';
import type { NotificationPayload } from '../types/notification';

export async function createNotification(
  userId: string,
  data: {
    title: string;
    body: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'PROMO';
    actionUrl?: string;
  }
): Promise<void> {
  const payload: NotificationPayload = { userId, ...data };
  const q = getNotificationQueue();
  if (q) {
    try {
      await q.add('create', payload, {
        removeOnComplete: { count: 2000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 1500 },
      });
      return;
    } catch (e) {
      console.error('[notifications] enqueue failed, persisting directly', e);
    }
  }
  await persistUserNotificationAndPublish(payload);
}

// Convenience wrappers used across the app
export const notify = {
  levelComplete: (userId: string, levelTitle: string) =>
    createNotification(userId, {
      title: `🎉 أكملت ${levelTitle}!`,
      body: 'رائع! انتقلت للمستوى التالي. استمر في التقدم!',
      type: 'SUCCESS',
      actionUrl: '/dashboard',
    }),

  achievementEarned: (userId: string, achievementName: string) =>
    createNotification(userId, {
      title: `🏅 إنجاز جديد: ${achievementName}`,
      body: 'لقد حصلت على شارة جديدة! تفقد إنجازاتك.',
      type: 'SUCCESS',
      actionUrl: '/streak',
    }),

  streakAtRisk: (userId: string, streakCount: number) =>
    createNotification(userId, {
      title: '🔥 سلسلتك في خطر!',
      body: `لديك ${streakCount} يوماً متواصلاً. درّس اليوم لا تكسر سلسلتك!`,
      type: 'WARNING',
      actionUrl: '/dashboard',
    }),

  trialExpiringSoon: (userId: string, daysLeft: number) =>
    createNotification(userId, {
      title: '⭐ تجربتك المجانية تنتهي قريباً',
      body: `تبقى ${daysLeft} أيام فقط. اشترك الآن للاستمرار في تعلمك!`,
      type: 'PROMO',
      actionUrl: '/upgrade',
    }),

  certificateReady: (userId: string) =>
    createNotification(userId, {
      title: '🎓 شهادتك جاهزة!',
      body: 'تهانينا! يمكنك تحميل شهادة إتمام معجَم الآن.',
      type: 'SUCCESS',
      actionUrl: '/certificate',
    }),
};

export async function getNotifications(userId: string, page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  const [notifications, unreadCount] = await Promise.all([
    prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.userNotification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    unreadCount,
    notifications,
    pagination: {
      page,
      hasMore: notifications.length === limit,
    },
  };
}

export async function markAsRead(userId: string, notificationId: string) {
  await prisma.userNotification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  await prisma.userNotification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.userNotification.count({
    where: { userId, isRead: false },
  });
}

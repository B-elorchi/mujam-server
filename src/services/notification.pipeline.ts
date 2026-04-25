import prisma from '../config/database';
import { getRedisPublisher } from '../config/redis';

export type NotificationPayload = {
  userId: string;
  title: string;
  body: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'PROMO';
  actionUrl?: string;
};

export type NotificationRealtimePayload = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

async function publishToUser(userId: string, payload: NotificationRealtimePayload): Promise<void> {
  const pub = getRedisPublisher();
  if (!pub) return;
  await pub.publish(`mujam:notify:${userId}`, JSON.stringify(payload));
}

/**
 * Persists a notification and pushes it to Redis for SSE subscribers.
 */
export async function insertAndPublishNotification(data: NotificationPayload): Promise<{ id: string }> {
  const row = await prisma.userNotification.create({
    data: {
      userId: data.userId,
      title: data.title,
      body: data.body,
      type: data.type,
      actionUrl: data.actionUrl,
    },
  });

  const realtime: NotificationRealtimePayload = {
    id: row.id,
    userId: row.userId,
    title: row.title,
    body: row.body,
    type: row.type,
    actionUrl: row.actionUrl,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };

  await publishToUser(row.userId, realtime);
  return { id: row.id };
}

import prisma from '../config/database';
import { getRedisPublisher } from '../config/redis';
import type { NotificationPayload } from '../types/notification';

export async function persistUserNotificationAndPublish(data: NotificationPayload): Promise<string> {
  const row = await prisma.userNotification.create({
    data: {
      userId: data.userId,
      title: data.title,
      body: data.body,
      type: data.type,
      actionUrl: data.actionUrl,
    },
  });

  const pub = getRedisPublisher();
  if (pub) {
    const payload = {
      id: row.id,
      userId: row.userId,
      title: row.title,
      body: row.body,
      type: row.type,
      actionUrl: row.actionUrl,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    };
    await pub.publish(`mujam:notify:${data.userId}`, JSON.stringify(payload));
  }

  return row.id;
}

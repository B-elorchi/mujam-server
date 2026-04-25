import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { persistUserNotificationAndPublish } from '../services/notification.persistence';
import type { NotificationPayload } from '../types/notification';

export const USER_NOTIFICATION_QUEUE = 'user-notifications';

let queue: Queue<NotificationPayload> | null = null;
let worker: Worker<NotificationPayload> | null = null;

export async function initNotificationQueue(): Promise<void> {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[notifications] REDIS_URL not set — persisting notifications synchronously to the database');
    return;
  }

  const connection = new Redis(url, { maxRetriesPerRequest: null });
  const workerConnection = new Redis(url, { maxRetriesPerRequest: null });

  queue = new Queue<NotificationPayload>(USER_NOTIFICATION_QUEUE, { connection });

  worker = new Worker<NotificationPayload>(
    USER_NOTIFICATION_QUEUE,
    async (job: Job<NotificationPayload>) => {
      return persistUserNotificationAndPublish(job.data);
    },
    { connection: workerConnection }
  );

  worker.on('failed', (job, err) => {
    console.error('[notifications] BullMQ job failed', job?.id, err);
  });
}

export function getNotificationQueue(): Queue<NotificationPayload> | null {
  return queue;
}

export async function closeNotificationQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (queue) {
    await queue.close();
    queue = null;
  }
}

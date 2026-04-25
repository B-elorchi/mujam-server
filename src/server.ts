import dotenv from 'dotenv';
import { buildApp } from './app';
import { initRedis, closeRedis } from './config/redis';
import { initNotificationQueue, closeNotificationQueue } from './queues/notifications.queue';

dotenv.config();
initRedis();

const app = buildApp();
const PORT = process.env.PORT || 4000;

const shutdown = async (signal: string) => {
  console.log(`${signal} received, shutting down…`);
  try {
    await closeNotificationQueue();
    await closeRedis();
  } catch (e) {
    console.error('Shutdown error:', e);
  }
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

void initNotificationQueue()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.REDIS_URL) {
        console.log('Redis: connected (BullMQ + real-time notifications)');
      } else {
        console.log('Redis: not configured (direct DB notifications, no SSE push)');
      }
    });
  })
  .catch((err) => {
    console.error('Failed to initialize notification queue:', err);
    process.exit(1);
  });

export default app;

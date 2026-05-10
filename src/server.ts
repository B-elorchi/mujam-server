import dotenv from 'dotenv';
import http from 'http';
import { buildApp } from './app';
import { initRedis, closeRedis } from './config/redis';
import { initNotificationQueue, closeNotificationQueue } from './queues/notifications.queue';
import { initSockets } from './sockets';

dotenv.config();
initRedis();

const app = buildApp();
const httpServer = http.createServer(app);
initSockets(httpServer);

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
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.REDIS_URL) {
        console.log('Redis: connected (BullMQ + real-time notifications + Socket.io)');
      } else {
        console.log('Redis: not configured (direct DB notifications, Socket.io without Redis adapter)');
      }
    });
  })
  .catch((err) => {
    console.error('Failed to initialize notification queue:', err);
    process.exit(1);
  });

export default app;

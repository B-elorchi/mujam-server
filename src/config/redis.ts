import Redis from 'ioredis';

let publisher: Redis | null = null;

/**
 * Call after dotenv.config(). Creates the shared Redis client used for pub/sub publishing.
 * Returns false when REDIS_URL is unset (notifications fall back to direct DB writes).
 */
export function initRedis(): boolean {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  if (!url) {
    return false;
  }
  publisher = new Redis(url, {
    maxRetriesPerRequest: null,
  });
  publisher.on('error', (err) => {
    console.error('[redis] publisher error:', err.message);
  });
  return true;
}

export function getRedisPublisher(): Redis | null {
  return publisher;
}

/** Dedicated subscriber connection (required by Redis pub/sub). */
export function createRedisSubscriber(): Redis | null {
  if (!publisher) return null;
  const sub = publisher.duplicate();
  sub.on('error', (err) => {
    console.error('[redis] subscriber error:', err.message);
  });
  return sub;
}

export async function closeRedis(): Promise<void> {
  if (publisher) {
    await publisher.quit();
    publisher = null;
  }
}

export function isRedisEnabled(): boolean {
  return publisher !== null;
}

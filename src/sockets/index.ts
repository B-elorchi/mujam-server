import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisPublisher, createRedisSubscriber } from '../config/redis';
import { verifyAccessToken } from '../utils/jwt';
import { registerCommunitySocket } from './community.socket';

let io: SocketIOServer | null = null;

export function initSockets(httpServer: HttpServer): SocketIOServer {
  const allowedOrigins = (
    process.env.FRONTEND_URL ||
    'http://localhost:3000,http://localhost:3001,http://localhost:8080'
  )
    .split(',')
    .map((o) => o.trim());

  io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  // Use Redis adapter for multi-instance scaling when Redis is available
  const pub = getRedisPublisher();
  if (pub) {
    const sub = createRedisSubscriber();
    if (sub) {
      io.adapter(createAdapter(pub, sub));
      console.log('Socket.io: Redis adapter enabled');
    }
  }

  // JWT auth middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string) ||
        (socket.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) return next(new Error('MISSING_TOKEN'));

      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  registerCommunitySocket(io);

  console.log('Socket.io: server initialized');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import levelRoutes from './routes/level.routes';
import gameRoutes from './routes/game.routes';
import quizRoutes from './routes/quiz.routes';
import placementRoutes from './routes/placement.routes';
import shadowingRoutes from './routes/shadowing.routes';
import aiRoutes from './routes/ai.routes';
import streakRoutes from './routes/streak.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import certificateRoutes from './routes/certificate.routes';
import notificationRoutes from './routes/notification.routes';
import referralRoutes from './routes/referral.routes';
import blogRoutes from './routes/blog.routes';
import subscriptionRoutes from './routes/subscription.routes';
import adminRoutes from './routes/admin/admin.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'https://app.moajam-sa.com,http://localhost:3000,http://localhost:8080').split(',').map((o) => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, origin || allowedOrigins[0]);
    return cb(null, false);
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger API docs
const openapiPath = path.join(__dirname, 'openapi.yaml');
const openapiSpec = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/placement', placementRoutes);
app.use('/api/shadowing', shadowingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
# Mu'jam Backend - Language Learning Platform API

A Node.js + Express + TypeScript backend for the Mu'jam Arabic-English language learning platform.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT (Access + Refresh tokens)
- **AI**: OpenAI (Whisper, GPT-4, TTS)
- **Storage**: Cloudinary
- **Email**: Resend

## Features

- User authentication (register, login, password reset)
- 7-level learning system with sentences, games, and quizzes
- AI-powered conversation practice
- Shadowing exercises with audio comparison
- Streak tracking and achievements
- Certificate generation
- Referral system
- Admin panel (users, content, AI settings, analytics, broadcast)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Docker (optional)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Start PostgreSQL (using Docker)
docker-compose up -d

# Run migrations
npx prisma migrate dev --name init

# Seed initial data
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:password@localhost:5432/mujam_db
JWT_ACCESS_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
DEEPGRAM_API_KEY=your-deepgram-api-key
AI_STT_MODEL=nova-2
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@mujam.com
```

## API Endpoints

**Interactive API docs (Swagger UI):** [http://localhost:4000/api-docs](http://localhost:4000/api-docs) — full OpenAPI spec with all routes, request bodies, and **Authorize** for Bearer token.

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### User
- `GET /api/users/profile` - Get profile
- `PATCH /api/users/profile` - Update profile
- `POST /api/users/avatar` - Upload avatar
- `GET /api/users/stats` - Get stats
- `GET /api/users/activity` - Get activity

### Learning
- `GET /api/levels` - Get all levels
- `GET /api/levels/:id/sentences` - Get sentences
- `GET /api/games` - Get games
- `GET /api/quiz` - Get quiz
- `GET /api/placement/questions` - Get placement test

### AI
- `GET /api/ai/scenarios` - Get AI scenarios
- `POST /api/ai/session/start` - Start AI session
- `POST /api/ai/session/:id/message` - Send message

### Shadowing
- `GET /api/shadowing/stories` - Get stories
- `POST /api/shadowing/transcribe` - Transcribe audio
- `POST /api/shadowing/compare` - Compare audio

### Other
- `GET /api/streak` - Get streak
- `GET /api/leaderboard` - Get leaderboard
- `GET /api/certificate` - Get certificate
- `GET /api/notifications` - Get notifications
- `GET /api/blog` - Get blog posts

### Admin
- `GET /api/admin/users` - Manage users
- `POST /api/admin/content/sentences` - Manage content
- `GET /api/admin/ai/settings` - AI settings
- `POST /api/admin/broadcast/send` - Send broadcast
- `GET /api/admin/analytics/overview` - Analytics

## Scripts

```bash
npm run dev          # Development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run db:migrate   # Run migrations
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run lint         # Lint code
```

## Deployment

### Using PM2

```bash
# Build the project
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save
```

### Using Docker

```bash
docker build -t mujam-server .
docker run -p 4000:4000 mujam-server
```

## License

ISC
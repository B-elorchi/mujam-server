-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN', 'EDITOR', 'AI_MANAGER', 'MARKETER', 'VIEWER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('DRAG_DROP', 'MULTIPLE_CHOICE', 'AUDIO_MATCH', 'FILL_BLANK');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'PROMO');

-- CreateEnum
CREATE TYPE "BroadcastTarget" AS ENUM ('ALL', 'FREE_USERS', 'PREMIUM_USERS', 'BY_LEVEL', 'INACTIVE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BroadcastChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'ALL');

-- CreateEnum
CREATE TYPE "AIMode" AS ENUM ('GUIDED', 'FREE');

-- CreateEnum
CREATE TYPE "BlogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "placementScore" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "priceMonthly" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sentence" (
    "id" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "textEn" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "audioUrlNormal" TEXT,
    "audioUrlSlow" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sentence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSentenceProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentenceId" TEXT NOT NULL,
    "listened" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "listenCount" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserSentenceProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLevelCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "sentencesDone" INTEGER NOT NULL DEFAULT 0,
    "gamesDone" INTEGER NOT NULL DEFAULT 0,
    "quizPassed" BOOLEAN NOT NULL DEFAULT false,
    "shadowingDone" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserLevelCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementQuestion" (
    "id" TEXT NOT NULL,
    "sentenceEn" TEXT NOT NULL,
    "correctAr" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlacementQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementTest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "assignedLevel" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacementTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "type" "GameType" NOT NULL,
    "titleAr" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameQuestion" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sentenceId" TEXT,
    "questionData" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGameProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserGameProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelQuiz" (
    "id" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "passScore" INTEGER NOT NULL DEFAULT 70,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "timeLimit" INTEGER,

    CONSTRAINT "LevelQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "sentenceId" TEXT,
    "type" "GameType" NOT NULL,
    "questionData" JSONB NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT,
    "fullText" TEXT NOT NULL,
    "audioUrl" TEXT,
    "wordsTiming" JSONB,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserShadowingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "accuracyScore" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UserShadowingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIScenario" (
    "id" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "openingMessage" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "mode" "AIMode" NOT NULL,
    "userLevel" INTEGER NOT NULL,
    "messages" JSONB NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" JSONB,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "AISession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "tokens" INTEGER,
    "characters" INTEGER,
    "durationMin" DOUBLE PRECISION,
    "costUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "gptModel" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "sttModel" TEXT NOT NULL DEFAULT 'whisper-1',
    "ttsModel" TEXT NOT NULL DEFAULT 'tts-1',
    "ttsVoice" TEXT NOT NULL DEFAULT 'nova',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "systemPrompt" TEXT NOT NULL,
    "correctionStyle" TEXT NOT NULL DEFAULT 'balanced',
    "formalityLevel" INTEGER NOT NULL DEFAULT 60,
    "monthlyBudgetUsd" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verifyCode" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStudyDate" TIMESTAMP(3),
    "freezesLeft" INTEGER NOT NULL DEFAULT 0,
    "totalStudyDays" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "descAr" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "condition" JSONB NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BroadcastMessage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "BroadcastChannel" NOT NULL,
    "target" "BroadcastTarget" NOT NULL,
    "targetConfig" JSONB,
    "actionUrl" TEXT,
    "icon" TEXT,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalOpened" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverColor" TEXT,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "status" "BlogStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "readingTime" INTEGER NOT NULL DEFAULT 5,
    "views" INTEGER NOT NULL DEFAULT 0,
    "metaDesc" TEXT,
    "keywords" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredId" TEXT NOT NULL,
    "rewardGiven" BOOLEAN NOT NULL DEFAULT false,
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "platformName" TEXT NOT NULL DEFAULT 'معجَم',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@mujam.com',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT,
    "freeAiLimit" INTEGER NOT NULL DEFAULT 3,
    "freeLevelsCount" INTEGER NOT NULL DEFAULT 2,
    "premiumMonthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 9.99,
    "premiumYearlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 7.99,
    "trialDays" INTEGER NOT NULL DEFAULT 7,
    "featureFlags" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_plan_idx" ON "User"("plan");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordReset_token_key" ON "PasswordReset"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_orderIndex_key" ON "Level"("orderIndex");

-- CreateIndex
CREATE INDEX "Sentence_levelId_idx" ON "Sentence"("levelId");

-- CreateIndex
CREATE INDEX "UserSentenceProgress_userId_idx" ON "UserSentenceProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSentenceProgress_userId_sentenceId_key" ON "UserSentenceProgress"("userId", "sentenceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLevelCompletion_userId_levelId_key" ON "UserLevelCompletion"("userId", "levelId");

-- CreateIndex
CREATE INDEX "PlacementTest_userId_idx" ON "PlacementTest"("userId");

-- CreateIndex
CREATE INDEX "Game_levelId_idx" ON "Game"("levelId");

-- CreateIndex
CREATE INDEX "GameQuestion_gameId_idx" ON "GameQuestion"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGameProgress_userId_gameId_key" ON "UserGameProgress"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "LevelQuiz_levelId_key" ON "LevelQuiz"("levelId");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "UserQuizAttempt_userId_quizId_idx" ON "UserQuizAttempt"("userId", "quizId");

-- CreateIndex
CREATE INDEX "Story_levelId_idx" ON "Story"("levelId");

-- CreateIndex
CREATE UNIQUE INDEX "UserShadowingProgress_userId_storyId_key" ON "UserShadowingProgress"("userId", "storyId");

-- CreateIndex
CREATE INDEX "AISession_userId_idx" ON "AISession"("userId");

-- CreateIndex
CREATE INDEX "AISession_startedAt_idx" ON "AISession"("startedAt");

-- CreateIndex
CREATE INDEX "AIUsageLog_createdAt_idx" ON "AIUsageLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_key" ON "Certificate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verifyCode_key" ON "Certificate"("verifyCode");

-- CreateIndex
CREATE INDEX "Certificate_verifyCode_idx" ON "Certificate"("verifyCode");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_userId_key" ON "UserStreak"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_key_key" ON "Achievement"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "UserNotification_userId_isRead_idx" ON "UserNotification"("userId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_slug_idx" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_period_points_idx" ON "LeaderboardEntry"("period", "points");

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_userId_period_key" ON "LeaderboardEntry"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredId_key" ON "Referral"("referredId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_token_key" ON "AdminInvitation"("token");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sentence" ADD CONSTRAINT "Sentence_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSentenceProgress" ADD CONSTRAINT "UserSentenceProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSentenceProgress" ADD CONSTRAINT "UserSentenceProgress_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLevelCompletion" ADD CONSTRAINT "UserLevelCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLevelCompletion" ADD CONSTRAINT "UserLevelCompletion_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementTest" ADD CONSTRAINT "PlacementTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameQuestion" ADD CONSTRAINT "GameQuestion_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameProgress" ADD CONSTRAINT "UserGameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameProgress" ADD CONSTRAINT "UserGameProgress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelQuiz" ADD CONSTRAINT "LevelQuiz_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LevelQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_sentenceId_fkey" FOREIGN KEY ("sentenceId") REFERENCES "Sentence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAttempt" ADD CONSTRAINT "UserQuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuizAttempt" ADD CONSTRAINT "UserQuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "LevelQuiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShadowingProgress" ADD CONSTRAINT "UserShadowingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShadowingProgress" ADD CONSTRAINT "UserShadowingProgress_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIScenario" ADD CONSTRAINT "AIScenario_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISession" ADD CONSTRAINT "AISession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISession" ADD CONSTRAINT "AISession_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "AIScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotification" ADD CONSTRAINT "UserNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

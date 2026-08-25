-- CreateTable
CREATE TABLE "DailyPathProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "sentenceIds" JSONB NOT NULL,
    "gameId" TEXT,
    "storyId" TEXT,
    "scenarioId" TEXT,
    "aiPromptEn" TEXT,
    "sentencesDone" BOOLEAN NOT NULL DEFAULT false,
    "gameDone" BOOLEAN NOT NULL DEFAULT false,
    "shadowingDone" BOOLEAN NOT NULL DEFAULT false,
    "aiDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyPathProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyChallengeProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "attempted" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyChallengeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyPathProgress_userId_idx" ON "DailyPathProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPathProgress_userId_date_key" ON "DailyPathProgress"("userId", "date");

-- CreateIndex
CREATE INDEX "WeeklyChallengeProgress_userId_idx" ON "WeeklyChallengeProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyChallengeProgress_userId_weekKey_key" ON "WeeklyChallengeProgress"("userId", "weekKey");

-- AddForeignKey
ALTER TABLE "DailyPathProgress" ADD CONSTRAINT "DailyPathProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyChallengeProgress" ADD CONSTRAINT "WeeklyChallengeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

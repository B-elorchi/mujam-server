-- Per-child lesson completion tracking for Moajam Kids
CREATE TABLE "KidsModuleProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 3,
    "minutesSpent" INTEGER NOT NULL DEFAULT 8,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KidsModuleProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KidsModuleProgress_userId_moduleId_key" ON "KidsModuleProgress"("userId", "moduleId");

CREATE INDEX "KidsModuleProgress_userId_idx" ON "KidsModuleProgress"("userId");

CREATE INDEX "KidsModuleProgress_moduleId_idx" ON "KidsModuleProgress"("moduleId");

CREATE INDEX "KidsModuleProgress_userId_completedAt_idx" ON "KidsModuleProgress"("userId", "completedAt");

ALTER TABLE "KidsModuleProgress" ADD CONSTRAINT "KidsModuleProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KidsModuleProgress" ADD CONSTRAINT "KidsModuleProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "KidsModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

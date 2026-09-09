-- CreateTable
CREATE TABLE "KidsStory" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "summaryEn" TEXT,
    "summaryAr" TEXT,
    "coverEmoji" TEXT NOT NULL DEFAULT '📖',
    "coverUrl" TEXT,
    "audioUrl" TEXT,
    "textEn" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "cuesEn" JSONB,
    "cuesAr" JSONB,
    "accentColor" TEXT NOT NULL DEFAULT 'sky',
    "orderIndex" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KidsStory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KidsStory_orderIndex_key" ON "KidsStory"("orderIndex");

-- CreateIndex
CREATE INDEX "KidsStory_isActive_orderIndex_idx" ON "KidsStory"("isActive", "orderIndex");

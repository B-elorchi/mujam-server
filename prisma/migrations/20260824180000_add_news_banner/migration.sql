-- CreateTable
CREATE TABLE "NewsBanner" (
    "id" TEXT NOT NULL,
    "messageAr" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "bgColor" TEXT,
    "textColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsBanner_isActive_orderIndex_idx" ON "NewsBanner"("isActive", "orderIndex");

-- Seed initial announcement (replaces previous hardcoded NewsBar)
INSERT INTO "NewsBanner" ("id", "messageAr", "linkUrl", "isActive", "orderIndex", "bgColor", "textColor", "createdAt", "updatedAt")
VALUES
  (
    'seed-news-daily-path',
    'جديد: جرّب مسار اليوم · تحدي التحدث الأسبوعي · تقرير الوالدين',
    '/dashboard#daily-path',
    true,
    0,
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed-news-weekly',
    'تحدي التحدث الأسبوعي — سجّل محاولتك وارفع مستواك',
    '/dashboard#weekly-challenge',
    true,
    1,
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'seed-news-parents',
    'تقرير الوالدين لمتابعة تقدّم الأطفال',
    '/kids/parent',
    true,
    2,
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

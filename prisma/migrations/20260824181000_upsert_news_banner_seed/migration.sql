-- Ensure default Arabic news banners exist for learner NewsBar (GET /api/news-banners).
-- Idempotent: safe if 20260824180000 already inserted these rows.
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
  )
ON CONFLICT ("id") DO NOTHING;

-- Ensure every kids story has a runtime cover image before making the field required.
UPDATE "KidsStory"
SET "coverUrl" = '/images/kids/stories/default-cover.svg'
WHERE "coverUrl" IS NULL OR "coverUrl" = '';

ALTER TABLE "KidsStory"
ALTER COLUMN "coverUrl" SET DEFAULT '/images/kids/stories/default-cover.svg',
ALTER COLUMN "coverUrl" SET NOT NULL;

-- Ordered read-along pages for Moajam Kids stories.
CREATE TABLE "KidsStoryPage" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "textEn" TEXT NOT NULL,
    "textAr" TEXT NOT NULL,
    "imageUrl" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KidsStoryPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KidsStoryPage_storyId_orderIndex_key" ON "KidsStoryPage"("storyId", "orderIndex");
CREATE INDEX "KidsStoryPage_storyId_orderIndex_idx" ON "KidsStoryPage"("storyId", "orderIndex");

ALTER TABLE "KidsStoryPage"
ADD CONSTRAINT "KidsStoryPage_storyId_fkey"
FOREIGN KEY ("storyId") REFERENCES "KidsStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

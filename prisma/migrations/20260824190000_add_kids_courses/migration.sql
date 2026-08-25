-- CreateTable
CREATE TABLE "KidsModule" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KidsModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KidsLessonScreen" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "KidsLessonScreen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KidsModule_orderIndex_key" ON "KidsModule"("orderIndex");

-- CreateIndex
CREATE INDEX "KidsModule_isActive_orderIndex_idx" ON "KidsModule"("isActive", "orderIndex");

-- CreateIndex
CREATE INDEX "KidsLessonScreen_moduleId_idx" ON "KidsLessonScreen"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "KidsLessonScreen_moduleId_orderIndex_key" ON "KidsLessonScreen"("moduleId", "orderIndex");

-- AddForeignKey
ALTER TABLE "KidsLessonScreen" ADD CONSTRAINT "KidsLessonScreen_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "KidsModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

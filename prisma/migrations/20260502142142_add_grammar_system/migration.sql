-- AlterTable
ALTER TABLE "Level" ADD COLUMN     "levelType" TEXT NOT NULL DEFAULT 'sentences';

-- AlterTable
ALTER TABLE "Sentence" ADD COLUMN     "difficultyNote" TEXT,
ADD COLUMN     "grammarCategory" TEXT,
ADD COLUMN     "grammarTipAr" TEXT,
ADD COLUMN     "grammarTipEn" TEXT,
ADD COLUMN     "pronounTipAr" TEXT;

-- CreateTable
CREATE TABLE "GrammarRule" (
    "id" TEXT NOT NULL,
    "levelId" INTEGER NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GrammarRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrammarRule_levelId_idx" ON "GrammarRule"("levelId");

-- AddForeignKey
ALTER TABLE "GrammarRule" ADD CONSTRAINT "GrammarRule_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;

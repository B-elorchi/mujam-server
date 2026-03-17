/*
  Warnings:

  - A unique constraint covering the columns `[levelId,orderIndex]` on the table `Sentence` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- AlterEnum
ALTER TYPE "GameType" ADD VALUE 'MIXED';

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "difficulty" "Difficulty" NOT NULL DEFAULT 'EASY';

-- AlterTable
ALTER TABLE "GameQuestion" ADD COLUMN     "type" "GameType";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "currentLevel" SET DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "Sentence_levelId_orderIndex_key" ON "Sentence"("levelId", "orderIndex");

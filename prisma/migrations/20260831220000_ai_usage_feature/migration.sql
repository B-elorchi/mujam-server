-- AlterTable
ALTER TABLE "AIUsageLog" ADD COLUMN "feature" TEXT;

-- CreateIndex
CREATE INDEX "AIUsageLog_feature_idx" ON "AIUsageLog"("feature");

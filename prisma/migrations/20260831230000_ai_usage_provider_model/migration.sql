-- AlterTable
ALTER TABLE "AIUsageLog" ADD COLUMN "provider" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "keyLabel" TEXT,
ADD COLUMN "outputBytes" INTEGER;

-- CreateIndex
CREATE INDEX "AIUsageLog_provider_idx" ON "AIUsageLog"("provider");

-- CreateIndex
CREATE INDEX "AIUsageLog_keyLabel_idx" ON "AIUsageLog"("keyLabel");

-- CreateIndex
CREATE INDEX "AIUsageLog_model_idx" ON "AIUsageLog"("model");

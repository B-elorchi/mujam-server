-- CreateEnum
CREATE TYPE "InviteAccess" AS ENUM ('MOAJAM', 'KIDS', 'BOTH');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "accessMoajam" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "accessKids" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "parentEmail" TEXT;

-- CreateIndex
CREATE INDEX "User_parentEmail_idx" ON "User"("parentEmail");

-- AlterTable UserInvitation
ALTER TABLE "UserInvitation" ADD COLUMN "access" "InviteAccess" NOT NULL DEFAULT 'MOAJAM';
ALTER TABLE "UserInvitation" ADD COLUMN "parentEmail" TEXT;

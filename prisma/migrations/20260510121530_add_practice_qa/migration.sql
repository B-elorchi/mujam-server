-- CreateEnum
CREATE TYPE "CommunityRoomType" AS ENUM ('PUBLIC', 'PRACTICE', 'QA');

-- CreateEnum
CREATE TYPE "PracticeInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "CommunityRoom" ADD COLUMN     "type" "CommunityRoomType" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "PracticeInvitation" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "privateRoomId" TEXT,
    "status" "PracticeInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticeInvitation_toUserId_status_idx" ON "PracticeInvitation"("toUserId", "status");

-- CreateIndex
CREATE INDEX "PracticeInvitation_fromUserId_idx" ON "PracticeInvitation"("fromUserId");

-- AddForeignKey
ALTER TABLE "PracticeInvitation" ADD CONSTRAINT "PracticeInvitation_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvitation" ADD CONSTRAINT "PracticeInvitation_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeInvitation" ADD CONSTRAINT "PracticeInvitation_privateRoomId_fkey" FOREIGN KEY ("privateRoomId") REFERENCES "CommunityRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

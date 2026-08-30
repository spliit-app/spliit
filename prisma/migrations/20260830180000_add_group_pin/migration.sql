-- AlterTable
ALTER TABLE "Group" ADD COLUMN "pinHash" TEXT;

-- CreateTable
CREATE TABLE "PinAttempt" (
    "groupId" TEXT NOT NULL,
    "clientKey" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "PinAttempt_pkey" PRIMARY KEY ("groupId","clientKey")
);

-- AddForeignKey
ALTER TABLE "PinAttempt" ADD CONSTRAINT "PinAttempt_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

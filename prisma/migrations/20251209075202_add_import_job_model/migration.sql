-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "expensesToCreate" JSONB NOT NULL,
    "totalExpenses" INTEGER NOT NULL,
    "processedExpenses" INTEGER NOT NULL DEFAULT 0,
    "nextIndex" INTEGER NOT NULL DEFAULT 0,
    "createdExpenseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

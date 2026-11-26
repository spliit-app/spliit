-- CreateEnum
CREATE TYPE "PaymentDueStatus" AS ENUM ('PENDING', 'SETTLED', 'CANCELLED', 'SUPERSEDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'CREATE_PAYMENT_DUE';
ALTER TYPE "ActivityType" ADD VALUE 'SETTLE_PAYMENT_DUE';
ALTER TYPE "ActivityType" ADD VALUE 'CANCEL_PAYMENT_DUE';

-- CreateTable
CREATE TABLE "PaymentDue" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "fromParticipantId" TEXT NOT NULL,
    "toParticipantId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "PaymentDueStatus" NOT NULL DEFAULT 'PENDING',
    "settledByExpenseId" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdByParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentDue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentDue_settledByExpenseId_key" ON "PaymentDue"("settledByExpenseId");

-- CreateIndex
CREATE INDEX "PaymentDue_groupId_status_idx" ON "PaymentDue"("groupId", "status");

-- CreateIndex
CREATE INDEX "PaymentDue_groupId_status_dueDate_idx" ON "PaymentDue"("groupId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "PaymentDue_fromParticipantId_status_dueDate_idx" ON "PaymentDue"("fromParticipantId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "PaymentDue_toParticipantId_status_dueDate_idx" ON "PaymentDue"("toParticipantId", "status", "dueDate");

-- AddForeignKey
ALTER TABLE "PaymentDue" ADD CONSTRAINT "PaymentDue_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDue" ADD CONSTRAINT "PaymentDue_fromParticipantId_fkey" FOREIGN KEY ("fromParticipantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDue" ADD CONSTRAINT "PaymentDue_toParticipantId_fkey" FOREIGN KEY ("toParticipantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDue" ADD CONSTRAINT "PaymentDue_settledByExpenseId_fkey" FOREIGN KEY ("settledByExpenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

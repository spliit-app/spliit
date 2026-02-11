-- CreateEnum
CREATE TYPE "RecurrenceRule" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "recurrenceRule" "RecurrenceRule" DEFAULT 'NONE',
ADD COLUMN     "recurringExpenseLinkId" TEXT;

-- CreateTable
CREATE TABLE "RecurringExpenseLink" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "currentFrameExpenseId" TEXT NOT NULL,
    "nextExpenseCreatedAt" TIMESTAMP(3),
    "nextExpenseDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringExpenseLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringExpenseLink_currentFrameExpenseId_key" ON "RecurringExpenseLink"("currentFrameExpenseId");

-- CreateIndex
CREATE INDEX "RecurringExpenseLink_groupId_idx" ON "RecurringExpenseLink"("groupId");

-- CreateIndex
CREATE INDEX "RecurringExpenseLink_groupId_nextExpenseCreatedAt_nextExpen_idx" ON "RecurringExpenseLink"("groupId", "nextExpenseCreatedAt", "nextExpenseDate" DESC);

-- AddForeignKey
ALTER TABLE "RecurringExpenseLink" ADD CONSTRAINT "RecurringExpenseLink_currentFrameExpenseId_fkey" FOREIGN KEY ("currentFrameExpenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

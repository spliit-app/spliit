-- CreateTable
CREATE TABLE "RecurringTransactions" (
    "groupId" VARCHAR(255) NOT NULL,
    "expenseId" VARCHAR(255) NOT NULL,
    "createNextAt" INT NOT NULL,
    "lockId" VARCHAR(255) DEFAULT NULL,

    CONSTRAINT "RecurringTransactions_pkey" PRIMARY KEY ("groupId", "expenseId")
);

CREATE INDEX "idx_recurring_transactions_group_expense_next_create" ON "RecurringTransactions" ("groupId", "expenseId", "createNextAt" DESC);
CREATE UNIQUE INDEX "idx_unq_recurring_transactions_lock_id" ON "RecurringTransactions" ("lockId");

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "recurringDays" TEXT NOT NULL DEFAULT 0;

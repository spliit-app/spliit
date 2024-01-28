/*
  Warnings:

  - You are about to drop the column `documentUrls` on the `Expense` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "documentUrls";

-- CreateTable
CREATE TABLE "ExpenseDocument" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expenseId" TEXT,

    CONSTRAINT "ExpenseDocument_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExpenseDocument" ADD CONSTRAINT "ExpenseDocument_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

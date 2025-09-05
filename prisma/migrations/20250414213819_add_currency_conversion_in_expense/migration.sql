-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "conversionRate" DECIMAL(65,30),
ADD COLUMN     "originalAmount" INTEGER,
ADD COLUMN     "originalCurrency" TEXT;

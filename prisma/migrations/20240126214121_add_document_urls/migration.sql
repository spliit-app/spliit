-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "documentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

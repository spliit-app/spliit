/*
  Warnings:

  - The `documentUrls` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "documentUrls",
ADD COLUMN     "documentUrls" JSONB[] DEFAULT ARRAY[]::JSONB[];

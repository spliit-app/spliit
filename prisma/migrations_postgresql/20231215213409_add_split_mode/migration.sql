-- CreateEnum
CREATE TYPE "SplitMode" AS ENUM ('EVENLY', 'BY_SHARES', 'BY_PERCENTAGE', 'BY_AMOUNT');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "splitMode" "SplitMode" NOT NULL DEFAULT 'EVENLY';

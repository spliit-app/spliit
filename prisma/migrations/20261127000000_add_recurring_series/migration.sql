-- CreateEnum
CREATE TYPE "RecurringSeriesKind" AS ENUM ('RECURRING', 'INSTALLMENTS');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "seriesId" TEXT,
ADD COLUMN     "occurrenceNumber" INTEGER;

-- CreateTable
CREATE TABLE "RecurringSeries" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "kind" "RecurringSeriesKind" NOT NULL DEFAULT 'RECURRING',
    "endDate" DATE,
    "occurrenceCount" INTEGER,
    "totalAmount" INTEGER,
    "totalOriginalAmount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringSeries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringSeries_groupId_idx" ON "RecurringSeries"("groupId");

-- CreateIndex
CREATE INDEX "Expense_seriesId_idx" ON "Expense"("seriesId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "RecurringSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSeries" ADD CONSTRAINT "RecurringSeries_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: the recurring expenses created before this migration become
-- series, so their occurrences get numbered too.
--
-- Each occurrence of a recurring expense is created as a copy of the previous
-- one, its creation time included: the occurrences of one series share a group
-- and a "createdAt". A series is such a set of expenses in which at least one
-- repeats (the latest one may have been set back to not repeating). It is
-- named after its first occurrence, and its occurrences are numbered by date.
CREATE TEMPORARY TABLE "_RecurringSeriesBackfill" AS
SELECT
    e."id",
    e."groupId",
    e."createdAt",
    FIRST_VALUE(e."id") OVER chain AS "seriesId",
    ROW_NUMBER() OVER chain AS "occurrenceNumber"
FROM "Expense" e
JOIN (
    SELECT "groupId", "createdAt"
    FROM "Expense"
    GROUP BY "groupId", "createdAt"
    HAVING BOOL_OR("recurrenceRule" IS NOT NULL AND "recurrenceRule" <> 'NONE')
) recurring
    ON recurring."groupId" = e."groupId"
    AND recurring."createdAt" = e."createdAt"
WINDOW chain AS (
    PARTITION BY e."groupId", e."createdAt"
    ORDER BY e."expenseDate", e."id"
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
);

INSERT INTO "RecurringSeries" ("id", "groupId", "kind", "createdAt")
SELECT DISTINCT "seriesId", "groupId", 'RECURRING'::"RecurringSeriesKind", "createdAt"
FROM "_RecurringSeriesBackfill";

UPDATE "Expense" e
SET "seriesId" = b."seriesId",
    "occurrenceNumber" = b."occurrenceNumber"
FROM "_RecurringSeriesBackfill" b
WHERE e."id" = b."id";

DROP TABLE "_RecurringSeriesBackfill";

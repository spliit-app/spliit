-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "recurringSeriesId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_groupId_recurringSeriesId_idx" ON "Expense"("groupId", "recurringSeriesId");

-- Every occurrence is copied from the previous one, createdAt included, so a
-- series shares the createdAt of its first expense.
UPDATE "Expense" AS e
SET "recurringSeriesId" = s."id"
FROM (
  SELECT DISTINCT ON ("groupId", "createdAt") "groupId", "createdAt", "id"
  FROM "Expense"
  WHERE "recurrenceRule" <> 'NONE'
  ORDER BY "groupId", "createdAt", "expenseDate", "id"
) AS s
WHERE e."groupId" = s."groupId"
  AND e."createdAt" = s."createdAt"
  AND e."recurrenceRule" <> 'NONE';

-- This migration cleans up existing data where the split mode is 'EVENLY'
-- but the shares are not set to 1. This ensures data consistency for
-- all expenses that should be split equally.

UPDATE "ExpensePaidFor"
SET "shares" = 1
WHERE "expenseId" IN (
  SELECT "id"
  FROM "Expense"
  WHERE "splitMode" = 'EVENLY'
);

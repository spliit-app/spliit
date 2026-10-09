-- A participant who is part of an expense can no longer be deleted: removing
-- them used to delete every expense they paid and their share of every other
-- one, silently changing everybody's balances.
--
-- DEFERRABLE INITIALLY DEFERRED (which Prisma cannot express, and ignores when
-- diffing) checks at commit rather than per statement. Deleting a whole group
-- cascades to its participants and its expenses as separate statements; a
-- per-statement check would refuse that as soon as the participants went
-- first.

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_paidById_fkey";

-- DropForeignKey
ALTER TABLE "ExpensePaidFor" DROP CONSTRAINT "ExpensePaidFor_participantId_fkey";

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "Participant"("id") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

-- AddForeignKey
ALTER TABLE "ExpensePaidFor" ADD CONSTRAINT "ExpensePaidFor_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE NO ACTION ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;

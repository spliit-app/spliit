-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Group_createdByUserId_idx" ON "Group"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: a group whose ledger already contains exactly one account belongs
-- to that account. Groups with no (or several) linked participants stay
-- creator-less, which means "reachable by link only" until somebody claims a
-- participant.
UPDATE "Group" g
SET "createdByUserId" = linked."userId"
FROM (
  SELECT "groupId", MIN("userId") AS "userId"
  FROM "Participant"
  WHERE "userId" IS NOT NULL
  GROUP BY "groupId"
  HAVING COUNT(*) = 1
) AS linked
WHERE g.id = linked."groupId";

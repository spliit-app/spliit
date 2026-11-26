-- Account-based access control.
--
-- Replaces "the group URL is the permission" with explicit memberships, and
-- fixes the referential actions that made removing a participant destroy the
-- group's financial history.

-- ---------------------------------------------------------------------------
-- 1. Stop destructive cascades from participants into ledger rows.
--
-- `Expense.paidBy` and `ExpensePaidFor.participant` were ON DELETE CASCADE, so
-- saving the group form after removing a name deleted every expense that person
-- had paid, and their share of every expense they were part of. RESTRICT makes
-- the database refuse instead; `updateGroup` turns that into a readable error.
-- ---------------------------------------------------------------------------
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_paidById_fkey";
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_paidById_fkey"
  FOREIGN KEY ("paidById") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExpensePaidFor" DROP CONSTRAINT "ExpensePaidFor_participantId_fkey";
ALTER TABLE "ExpensePaidFor" ADD CONSTRAINT "ExpensePaidFor_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentDue" DROP CONSTRAINT "PaymentDue_fromParticipantId_fkey";
ALTER TABLE "PaymentDue" ADD CONSTRAINT "PaymentDue_fromParticipantId_fkey"
  FOREIGN KEY ("fromParticipantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentDue" DROP CONSTRAINT "PaymentDue_toParticipantId_fkey";
ALTER TABLE "PaymentDue" ADD CONSTRAINT "PaymentDue_toParticipantId_fkey"
  FOREIGN KEY ("toParticipantId") REFERENCES "Participant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A participant who leaves keeps their identity so history stays coherent.
ALTER TABLE "Participant" ADD COLUMN "removedAt" TIMESTAMP(3);

-- ---------------------------------------------------------------------------
-- 2. Memberships.
-- ---------------------------------------------------------------------------
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'REMOVED');

CREATE TABLE "GroupMembership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupMembership_groupId_userId_key" ON "GroupMembership"("groupId", "userId");
CREATE INDEX "GroupMembership_userId_idx" ON "GroupMembership"("userId");

ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMembership" ADD CONSTRAINT "GroupMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Invitations.
-- ---------------------------------------------------------------------------
CREATE TABLE "GroupInvite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedByUserId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupInvite_token_key" ON "GroupInvite"("token");
CREATE INDEX "GroupInvite_groupId_idx" ON "GroupInvite"("groupId");
CREATE INDEX "GroupInvite_email_idx" ON "GroupInvite"("email");

ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroupInvite" ADD CONSTRAINT "GroupInvite_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4. Backfill: existing groups must not disappear.
--
-- Without this, enabling the membership check would lock every current user out
-- of their own data. The creator becomes OWNER; every participant already
-- linked to an account becomes a MEMBER. The ON CONFLICT makes the second
-- statement a no-op for creators who are also participants, so OWNER wins.
-- ---------------------------------------------------------------------------
INSERT INTO "GroupMembership" ("id", "groupId", "userId", "role", "status", "createdAt", "updatedAt")
SELECT
    replace(gen_random_uuid()::text, '-', ''),
    g."id",
    g."createdByUserId",
    'OWNER',
    'ACTIVE',
    g."createdAt",
    CURRENT_TIMESTAMP
FROM "Group" g
WHERE g."createdByUserId" IS NOT NULL
ON CONFLICT ("groupId", "userId") DO NOTHING;

INSERT INTO "GroupMembership" ("id", "groupId", "userId", "role", "status", "createdAt", "updatedAt")
SELECT
    replace(gen_random_uuid()::text, '-', ''),
    p."groupId",
    p."userId",
    'MEMBER',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Participant" p
WHERE p."userId" IS NOT NULL
ON CONFLICT ("groupId", "userId") DO NOTHING;

-- A group with no creator but exactly one linked participant (the shape the
-- previous backfill produced) is owned by that participant, not merely joined
-- by them. Otherwise those groups would have no one able to manage members.
UPDATE "GroupMembership" m
SET "role" = 'OWNER'
WHERE m."role" = 'MEMBER'
  AND m."groupId" IN (SELECT "id" FROM "Group" WHERE "createdByUserId" IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM "GroupMembership" o
    WHERE o."groupId" = m."groupId" AND o."role" = 'OWNER'
  );

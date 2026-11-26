-- At most one PENDING settle-up per (group, debtor, creditor).
--
-- Re-asking supersedes the previous row first, so the normal path is unaffected;
-- this only rejects two concurrent requests that would otherwise both create a
-- pending obligation for the same pair. Prisma cannot express a partial index,
-- hence raw SQL.
CREATE UNIQUE INDEX "PaymentDue_one_pending_per_pair"
  ON "PaymentDue" ("groupId", "fromParticipantId", "toParticipantId")
  WHERE "status" = 'PENDING';

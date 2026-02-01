/*
  Warnings:

  - A unique constraint covering the columns `[passkeyCredentialId]` on the table `AnonymousUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AnonymousUser" ADD COLUMN     "passkeyCounter" INTEGER,
ADD COLUMN     "passkeyCredentialId" TEXT,
ADD COLUMN     "passkeyPublicKey" BYTEA,
ADD COLUMN     "passkeyTransports" TEXT,
ADD COLUMN     "passkeysEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousUser_passkeyCredentialId_key" ON "AnonymousUser"("passkeyCredentialId");

-- CreateTable
CREATE TABLE "AnonymousUser" (
    "id" TEXT NOT NULL,
    "passphraseHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnonymousUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousUserGroup" (
    "anonymousUserId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousUserGroup_pkey" PRIMARY KEY ("anonymousUserId","groupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousUser_passphraseHash_key" ON "AnonymousUser"("passphraseHash");

-- CreateIndex
CREATE INDEX "AnonymousUserGroup_groupId_idx" ON "AnonymousUserGroup"("groupId");

-- AddForeignKey
ALTER TABLE "AnonymousUserGroup" ADD CONSTRAINT "AnonymousUserGroup_anonymousUserId_fkey" FOREIGN KEY ("anonymousUserId") REFERENCES "AnonymousUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousUserGroup" ADD CONSTRAINT "AnonymousUserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

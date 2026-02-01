/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `AnonymousUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AnonymousUser" ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AnonymousUser_username_key" ON "AnonymousUser"("username");

/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Note` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Note" DROP CONSTRAINT "Note_userId_fkey";

-- DropIndex
DROP INDEX "Note_clientId_userId_idx";

-- AlterTable
ALTER TABLE "Note" DROP COLUMN "updatedAt",
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Note_clientId_idx" ON "Note"("clientId");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

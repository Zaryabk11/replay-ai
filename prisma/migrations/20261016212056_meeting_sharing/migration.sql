-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_shareToken_key" ON "Meeting"("shareToken");

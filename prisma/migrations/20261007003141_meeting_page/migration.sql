-- Meeting page: action-item triage, named speakers, and the summary prose
-- (headline/overview were being generated and then dropped).

-- CreateEnum
CREATE TYPE "ActionItemStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DISMISSED');

-- AlterTable
-- `done` is replaced by a three-state status. Nothing has written it yet, but
-- carry its meaning across rather than dropping the column blind.
ALTER TABLE "ActionItem" ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ActionItemStatus" NOT NULL DEFAULT 'PROPOSED';
UPDATE "ActionItem" SET "status" = 'ACCEPTED' WHERE "done" = true;
ALTER TABLE "ActionItem" DROP COLUMN "done";
-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "summaryHeadline" TEXT,
ADD COLUMN     "summaryOverview" TEXT;

-- CreateTable
CREATE TABLE "Speaker" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Speaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Speaker_meetingId_idx" ON "Speaker"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "Speaker_meetingId_key_key" ON "Speaker"("meetingId", "key");

-- AddForeignKey
ALTER TABLE "Speaker" ADD CONSTRAINT "Speaker_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;


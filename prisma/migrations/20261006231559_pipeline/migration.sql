-- Pipeline: staged MeetingStatus, Blob + Deepgram fields on Meeting,
-- stable segment indices, and citation links from points and action items.

-- AlterEnum
-- PENDING and PROCESSING are retired. Rows holding them would fail the cast,
-- so the column goes via TEXT and the old values are remapped first.
BEGIN;
CREATE TYPE "MeetingStatus_new" AS ENUM ('UPLOADED', 'TRANSCRIBING', 'SUMMARIZING', 'VALIDATING', 'READY', 'FAILED');
ALTER TABLE "public"."Meeting" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Meeting" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
UPDATE "public"."Meeting" SET "status" = 'UPLOADED' WHERE "status" = 'PENDING';
UPDATE "public"."Meeting" SET "status" = 'TRANSCRIBING' WHERE "status" = 'PROCESSING';
ALTER TABLE "public"."Meeting" ALTER COLUMN "status" TYPE "MeetingStatus_new" USING ("status"::"MeetingStatus_new");
ALTER TYPE "MeetingStatus" RENAME TO "MeetingStatus_old";
ALTER TYPE "MeetingStatus_new" RENAME TO "MeetingStatus";
DROP TYPE "public"."MeetingStatus_old";
ALTER TABLE "public"."Meeting" ALTER COLUMN "status" SET DEFAULT 'UPLOADED';
COMMIT;

-- DropIndex
DROP INDEX "Meeting_userId_idx";

-- AlterTable
ALTER TABLE "ActionItem" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "segmentId" TEXT;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "blobPathname" TEXT,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "droppedCitations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "failureStage" TEXT,
ADD COLUMN     "processingStartedAt" TIMESTAMP(3),
ADD COLUMN     "readyAt" TIMESTAMP(3),
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "transcriptRaw" JSONB,
ADD COLUMN     "transcriptionRequestId" TEXT;

-- AlterTable
ALTER TABLE "SummaryPoint" ADD COLUMN     "segmentId" TEXT;

-- AlterTable
-- Added with a default so any pre-existing row is valid, then the default is
-- dropped: from here on the pipeline always sets the index explicitly.
ALTER TABLE "TranscriptSegment" ADD COLUMN "index" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TranscriptSegment" ALTER COLUMN "index" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "ActionItem_segmentId_idx" ON "ActionItem"("segmentId");

-- CreateIndex
CREATE INDEX "Meeting_userId_createdAt_idx" ON "Meeting"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Meeting_transcriptionRequestId_idx" ON "Meeting"("transcriptionRequestId");

-- CreateIndex
CREATE INDEX "SummaryPoint_segmentId_idx" ON "SummaryPoint"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptSegment_meetingId_index_key" ON "TranscriptSegment"("meetingId", "index");

-- AddForeignKey
ALTER TABLE "SummaryPoint" ADD CONSTRAINT "SummaryPoint_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TranscriptSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "TranscriptSegment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "citationsDropped" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "citationsProposed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "citationsValidated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "processingDurationMs" INTEGER,
ADD COLUMN     "speakerCount" INTEGER;

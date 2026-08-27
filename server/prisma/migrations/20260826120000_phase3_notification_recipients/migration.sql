-- Phase 3: resolve notification recipients to real User records instead of free-text
-- role/name strings. Purely additive — every new column is nullable, no existing data is
-- touched, and the existing `recipient` (display name) column is kept as-is for backward
-- compatibility with pre-Phase-3 rows and the Admin "view another recipient's feed by
-- name" override.

-- AlterTable
ALTER TABLE "NotificationEvent"
  ADD COLUMN "recipientId" TEXT,
  ADD COLUMN "workplace" TEXT,
  ADD COLUMN "priority" TEXT,
  ADD COLUMN "reminderKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NotificationEvent_reminderKey_key" ON "NotificationEvent"("reminderKey");

-- CreateIndex
CREATE INDEX "NotificationEvent_recipientId_idx" ON "NotificationEvent"("recipientId");

-- CreateIndex
CREATE INDEX "NotificationEvent_workplace_idx" ON "NotificationEvent"("workplace");

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

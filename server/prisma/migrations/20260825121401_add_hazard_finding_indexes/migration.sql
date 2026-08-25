-- Speeds up the hazard/finding "related records" lookups (now filtered server-side
-- instead of fetching entire tables and filtering client-side).
CREATE INDEX "Finding_hazardId_idx" ON "Finding"("hazardId");

CREATE INDEX "CorrectiveAction_hazardId_idx" ON "CorrectiveAction"("hazardId");

CREATE INDEX "CorrectiveAction_findingId_idx" ON "CorrectiveAction"("findingId");

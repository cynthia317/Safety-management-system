-- Phase 2: real relational linkage between Hazards, Findings, Inspections, Risk
-- Assessments, and Corrective Actions. Purely additive — new nullable columns, new
-- indexes, new FK constraints — no column is dropped and no existing data is touched.
-- Every FK uses ON DELETE SET NULL (never CASCADE): removing a parent record must not
-- silently destroy historical Findings/CorrectiveActions/RiskAssessments, since there is
-- no delete endpoint for any of these in the app today and, if one is added later, EHS
-- history should be preserved rather than cascaded away.
--
-- Existing HazardReport/Finding/Inspection/CorrectiveAction rows were verified to have no
-- dangling hazardId/findingId/inspectionId references before this migration was written,
-- so the new FK constraints on those pre-existing columns apply cleanly.

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "questionResponseId" TEXT;

-- AlterTable
ALTER TABLE "CorrectiveAction" ADD COLUMN     "riskAssessmentId" TEXT,
ADD COLUMN     "riskAssessmentReferenceNumber" TEXT;

-- AlterTable
ALTER TABLE "RiskAssessment" ADD COLUMN     "hazardId" TEXT,
ADD COLUMN     "hazardReferenceNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Finding_questionResponseId_key" ON "Finding"("questionResponseId");

-- CreateIndex
CREATE INDEX "Finding_inspectionId_idx" ON "Finding"("inspectionId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_inspectionId_idx" ON "CorrectiveAction"("inspectionId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_riskAssessmentId_idx" ON "CorrectiveAction"("riskAssessmentId");

-- CreateIndex
CREATE INDEX "RiskAssessment_hazardId_idx" ON "RiskAssessment"("hazardId");

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "HazardReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_questionResponseId_fkey" FOREIGN KEY ("questionResponseId") REFERENCES "QuestionResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "HazardReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "RiskAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "HazardReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

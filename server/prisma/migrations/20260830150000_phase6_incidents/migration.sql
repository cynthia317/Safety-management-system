-- AlterTable
ALTER TABLE "CorrectiveAction" ADD COLUMN     "incidentId" TEXT,
ADD COLUMN     "incidentReferenceNumber" TEXT;

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "peopleInvolved" TEXT NOT NULL,
    "injuryOccurred" BOOLEAN NOT NULL,
    "injurySeverity" TEXT,
    "immediateActionTaken" TEXT NOT NULL,
    "actualSeverity" TEXT NOT NULL,
    "potentialSeverity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "leadInvestigator" TEXT NOT NULL,
    "investigationSummary" TEXT NOT NULL,
    "rootCause" TEXT NOT NULL,
    "contributingFactors" TEXT NOT NULL,
    "lessonsLearned" TEXT NOT NULL,
    "hazardId" TEXT,
    "hazardReferenceNumber" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentActivityEntry" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentActivityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentComment" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentEvidenceItem" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentEvidenceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Incident_referenceNumber_key" ON "Incident"("referenceNumber");

-- CreateIndex
CREATE INDEX "Incident_workplace_idx" ON "Incident"("workplace");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_eventType_idx" ON "Incident"("eventType");

-- CreateIndex
CREATE INDEX "Incident_eventDate_idx" ON "Incident"("eventDate");

-- CreateIndex
CREATE INDEX "Incident_leadInvestigator_idx" ON "Incident"("leadInvestigator");

-- CreateIndex
CREATE INDEX "Incident_potentialSeverity_idx" ON "Incident"("potentialSeverity");

-- CreateIndex
CREATE INDEX "Incident_hazardId_idx" ON "Incident"("hazardId");

-- CreateIndex
CREATE INDEX "IncidentActivityEntry_incidentId_idx" ON "IncidentActivityEntry"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentComment_incidentId_idx" ON "IncidentComment"("incidentId");

-- CreateIndex
CREATE INDEX "IncidentEvidenceItem_incidentId_idx" ON "IncidentEvidenceItem"("incidentId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_incidentId_idx" ON "CorrectiveAction"("incidentId");

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "HazardReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentActivityEntry" ADD CONSTRAINT "IncidentActivityEntry_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentComment" ADD CONSTRAINT "IncidentComment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentEvidenceItem" ADD CONSTRAINT "IncidentEvidenceItem_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

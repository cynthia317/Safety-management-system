-- CreateTable
CREATE TABLE "Counter" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Workplace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organisation" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workplaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Area_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "Location_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HazardReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "hazardCategory" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "peopleAtRisk" TEXT NOT NULL,
    "immediateActionTaken" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "reportedAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HazardActivityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hazardId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "HazardActivityEntry_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "HazardReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HazardComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hazardId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "HazardComment_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "HazardReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HazardEvidenceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hazardId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL,
    CONSTRAINT "HazardEvidenceItem_hazardId_fkey" FOREIGN KEY ("hazardId") REFERENCES "HazardReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "hazardId" TEXT,
    "hazardReferenceNumber" TEXT,
    "inspectionId" TEXT,
    "inspectionReferenceNumber" TEXT,
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FindingActivityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "findingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "FindingActivityEntry_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FindingComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "findingId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "FindingComment_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "Finding" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "applicableIndustries" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TemplateSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "TemplateSection_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InspectionTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TemplateQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "guidance" TEXT NOT NULL,
    "referenceNote" TEXT NOT NULL,
    "responseType" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "evidenceRequired" BOOLEAN NOT NULL,
    "allowFindingCreation" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL,
    CONSTRAINT "TemplateQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TemplateSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "templateSnapshot" JSONB NOT NULL,
    "organisation" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "specificLocation" TEXT NOT NULL,
    "inspectionDate" DATETIME NOT NULL,
    "leadInspector" TEXT NOT NULL,
    "additionalInspectors" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "submittedAt" DATETIME,
    "reviewedAt" DATETIME
);

-- CreateTable
CREATE TABLE "QuestionResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "responseType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "evidenceNote" TEXT NOT NULL,
    "potentialFinding" JSONB,
    "answeredAt" DATETIME NOT NULL,
    CONSTRAINT "QuestionResponse_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InspectionActivityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inspectionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "InspectionActivityEntry_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrectiveAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "findingId" TEXT,
    "findingReferenceNumber" TEXT,
    "hazardId" TEXT,
    "hazardReferenceNumber" TEXT,
    "inspectionId" TEXT,
    "inspectionReferenceNumber" TEXT,
    "externalSourceReference" TEXT,
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "responseNote" TEXT NOT NULL,
    "respondedAt" DATETIME,
    "evidenceNote" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "verifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME
);

-- CreateTable
CREATE TABLE "CorrectiveActionActivityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "correctiveActionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "CorrectiveActionActivityEntry_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "CorrectiveAction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrectiveActionComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "correctiveActionId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "CorrectiveActionComment_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "CorrectiveAction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorrectiveActionEvidenceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "correctiveActionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL,
    CONSTRAINT "CorrectiveActionEvidenceItem_correctiveActionId_fkey" FOREIGN KEY ("correctiveActionId") REFERENCES "CorrectiveAction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assessmentType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "workplace" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assessedBy" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "assessmentDate" DATETIME NOT NULL,
    "nextReviewDate" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RiskAssessmentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riskAssessmentId" TEXT NOT NULL,
    "hazard" TEXT NOT NULL,
    "whoMightBeHarmed" TEXT NOT NULL,
    "existingControls" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "severity" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "additionalControls" TEXT NOT NULL,
    "residualLikelihood" INTEGER,
    "residualSeverity" INTEGER,
    "residualRiskScore" INTEGER,
    "residualRiskLevel" TEXT,
    "order" INTEGER NOT NULL,
    CONSTRAINT "RiskAssessmentItem_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "RiskAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RiskAssessmentActivityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "riskAssessmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "RiskAssessmentActivityEntry_riskAssessmentId_fkey" FOREIGN KEY ("riskAssessmentId") REFERENCES "RiskAssessment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "relatedEntityType" TEXT NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "relatedEntityReference" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" DATETIME,
    "readAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Area_workplaceId_idx" ON "Area"("workplaceId");

-- CreateIndex
CREATE INDEX "Location_areaId_idx" ON "Location"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "HazardReport_referenceNumber_key" ON "HazardReport"("referenceNumber");

-- CreateIndex
CREATE INDEX "HazardActivityEntry_hazardId_idx" ON "HazardActivityEntry"("hazardId");

-- CreateIndex
CREATE INDEX "HazardComment_hazardId_idx" ON "HazardComment"("hazardId");

-- CreateIndex
CREATE INDEX "HazardEvidenceItem_hazardId_idx" ON "HazardEvidenceItem"("hazardId");

-- CreateIndex
CREATE UNIQUE INDEX "Finding_referenceNumber_key" ON "Finding"("referenceNumber");

-- CreateIndex
CREATE INDEX "FindingActivityEntry_findingId_idx" ON "FindingActivityEntry"("findingId");

-- CreateIndex
CREATE INDEX "FindingComment_findingId_idx" ON "FindingComment"("findingId");

-- CreateIndex
CREATE INDEX "TemplateSection_templateId_idx" ON "TemplateSection"("templateId");

-- CreateIndex
CREATE INDEX "TemplateQuestion_sectionId_idx" ON "TemplateQuestion"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_referenceNumber_key" ON "Inspection"("referenceNumber");

-- CreateIndex
CREATE INDEX "QuestionResponse_inspectionId_idx" ON "QuestionResponse"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionResponse_inspectionId_questionId_key" ON "QuestionResponse"("inspectionId", "questionId");

-- CreateIndex
CREATE INDEX "InspectionActivityEntry_inspectionId_idx" ON "InspectionActivityEntry"("inspectionId");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectiveAction_referenceNumber_key" ON "CorrectiveAction"("referenceNumber");

-- CreateIndex
CREATE INDEX "CorrectiveActionActivityEntry_correctiveActionId_idx" ON "CorrectiveActionActivityEntry"("correctiveActionId");

-- CreateIndex
CREATE INDEX "CorrectiveActionComment_correctiveActionId_idx" ON "CorrectiveActionComment"("correctiveActionId");

-- CreateIndex
CREATE INDEX "CorrectiveActionEvidenceItem_correctiveActionId_idx" ON "CorrectiveActionEvidenceItem"("correctiveActionId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_referenceNumber_key" ON "RiskAssessment"("referenceNumber");

-- CreateIndex
CREATE INDEX "RiskAssessmentItem_riskAssessmentId_idx" ON "RiskAssessmentItem"("riskAssessmentId");

-- CreateIndex
CREATE INDEX "RiskAssessmentActivityEntry_riskAssessmentId_idx" ON "RiskAssessmentActivityEntry"("riskAssessmentId");

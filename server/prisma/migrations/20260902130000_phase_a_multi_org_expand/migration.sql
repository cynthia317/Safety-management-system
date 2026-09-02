-- AlterTable
ALTER TABLE "CorrectiveAction" ADD COLUMN     "assignedToUserId" TEXT,
ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "Finding" ADD COLUMN     "assignedToUserId" TEXT,
ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "HazardReport" ADD COLUMN     "assignedToUserId" TEXT,
ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "InspectionTemplate" ADD COLUMN     "organisationId" TEXT;

-- AlterTable
ALTER TABLE "NotificationEvent" ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "RiskAssessment" ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organisationId" TEXT,
ADD COLUMN     "workplaceId" TEXT;

-- AlterTable
ALTER TABLE "Workplace" ADD COLUMN     "organisationId" TEXT;

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "workplaceId" TEXT,
    "invitedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organisation_status_idx" ON "Organisation"("status");

-- CreateIndex
CREATE INDEX "Organisation_name_idx" ON "Organisation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_token_key" ON "Invite"("token");

-- CreateIndex
CREATE INDEX "Invite_organisationId_idx" ON "Invite"("organisationId");

-- CreateIndex
CREATE INDEX "Invite_workplaceId_idx" ON "Invite"("workplaceId");

-- CreateIndex
CREATE INDEX "Invite_email_idx" ON "Invite"("email");

-- CreateIndex
CREATE INDEX "CorrectiveAction_workplaceId_idx" ON "CorrectiveAction"("workplaceId");

-- CreateIndex
CREATE INDEX "CorrectiveAction_assignedToUserId_idx" ON "CorrectiveAction"("assignedToUserId");

-- CreateIndex
CREATE INDEX "Finding_workplaceId_idx" ON "Finding"("workplaceId");

-- CreateIndex
CREATE INDEX "Finding_assignedToUserId_idx" ON "Finding"("assignedToUserId");

-- CreateIndex
CREATE INDEX "HazardReport_workplaceId_idx" ON "HazardReport"("workplaceId");

-- CreateIndex
CREATE INDEX "HazardReport_assignedToUserId_idx" ON "HazardReport"("assignedToUserId");

-- CreateIndex
CREATE INDEX "Incident_workplaceId_idx" ON "Incident"("workplaceId");

-- CreateIndex
CREATE INDEX "Inspection_workplaceId_idx" ON "Inspection"("workplaceId");

-- CreateIndex
CREATE INDEX "InspectionTemplate_organisationId_idx" ON "InspectionTemplate"("organisationId");

-- CreateIndex
CREATE INDEX "NotificationEvent_workplaceId_idx" ON "NotificationEvent"("workplaceId");

-- CreateIndex
CREATE INDEX "RiskAssessment_workplaceId_idx" ON "RiskAssessment"("workplaceId");

-- CreateIndex
CREATE INDEX "User_organisationId_idx" ON "User"("organisationId");

-- CreateIndex
CREATE INDEX "User_workplaceId_idx" ON "User"("workplaceId");

-- CreateIndex
CREATE INDEX "Workplace_organisationId_idx" ON "Workplace"("organisationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workplace" ADD CONSTRAINT "Workplace_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardReport" ADD CONSTRAINT "HazardReport_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HazardReport" ADD CONSTRAINT "HazardReport_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTemplate" ADD CONSTRAINT "InspectionTemplate_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectiveAction" ADD CONSTRAINT "CorrectiveAction_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE SET NULL ON UPDATE CASCADE;


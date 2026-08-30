-- CreateTable
CREATE TABLE "WorkplaceActivityEntry" (
    "id" TEXT NOT NULL,
    "workplaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkplaceActivityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionTemplateActivityEntry" (
    "id" TEXT NOT NULL,
    "inspectionTemplateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InspectionTemplateActivityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkplaceActivityEntry_workplaceId_idx" ON "WorkplaceActivityEntry"("workplaceId");

-- CreateIndex
CREATE INDEX "InspectionTemplateActivityEntry_inspectionTemplateId_idx" ON "InspectionTemplateActivityEntry"("inspectionTemplateId");

-- AddForeignKey
ALTER TABLE "WorkplaceActivityEntry" ADD CONSTRAINT "WorkplaceActivityEntry_workplaceId_fkey" FOREIGN KEY ("workplaceId") REFERENCES "Workplace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTemplateActivityEntry" ADD CONSTRAINT "InspectionTemplateActivityEntry_inspectionTemplateId_fkey" FOREIGN KEY ("inspectionTemplateId") REFERENCES "InspectionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

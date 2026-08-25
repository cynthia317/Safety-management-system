import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import { computeRiskLevel, computeRiskScore, highestRiskLevel, type RiskLevel } from './riskMatrix';
import type {
  RiskAssessment as PrismaRiskAssessment,
  RiskAssessmentActivityEntry as PrismaRiskAssessmentActivityEntry,
  RiskAssessmentItem as PrismaRiskAssessmentItem,
} from '@prisma/client';
import type {
  AssessmentType,
  CreateRiskAssessmentInput,
  RiskAssessment,
  RiskAssessmentActivityEntry,
  RiskAssessmentActivityType,
  RiskAssessmentDetail,
  RiskAssessmentItem,
  RiskAssessmentItemInput,
  RiskAssessmentStatus,
  UpdateRiskAssessmentInput,
} from './types';

async function nextReferenceNumber(): Promise<string> {
  const value = await nextCounterValue('riskAssessment', 0);
  return `RA-${String(value).padStart(4, '0')}`;
}

function itemFromRow(row: PrismaRiskAssessmentItem): RiskAssessmentItem {
  return {
    id: row.id,
    hazard: row.hazard,
    whoMightBeHarmed: row.whoMightBeHarmed,
    existingControls: row.existingControls,
    likelihood: row.likelihood,
    severity: row.severity,
    riskScore: row.riskScore,
    riskLevel: row.riskLevel as RiskLevel,
    additionalControls: row.additionalControls,
    residualLikelihood: row.residualLikelihood,
    residualSeverity: row.residualSeverity,
    residualRiskScore: row.residualRiskScore,
    residualRiskLevel: row.residualRiskLevel as RiskLevel | null,
    order: row.order,
  };
}

function activityFromRow(row: PrismaRiskAssessmentActivityEntry): RiskAssessmentActivityEntry {
  return {
    id: row.id,
    riskAssessmentId: row.riskAssessmentId,
    type: row.type as RiskAssessmentActivityType,
    message: row.message,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

function fromRow(row: PrismaRiskAssessment, items: PrismaRiskAssessmentItem[]): RiskAssessment {
  const materializedItems = items.map(itemFromRow);
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    title: row.title,
    assessmentType: row.assessmentType as AssessmentType,
    description: row.description,
    workplace: row.workplace,
    department: row.department,
    location: row.location,
    status: row.status as RiskAssessmentStatus,
    assessedBy: row.assessedBy,
    approvedBy: row.approvedBy,
    assessmentDate: row.assessmentDate.toISOString(),
    nextReviewDate: row.nextReviewDate ? row.nextReviewDate.toISOString() : '',
    items: materializedItems,
    overallRiskLevel: computeOverallRiskLevel(materializedItems),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function computeOverallRiskLevel(items: RiskAssessmentItem[]): RiskLevel {
  if (items.length === 0) return 'Low';
  return highestRiskLevel(items.map((i) => i.residualRiskLevel ?? i.riskLevel));
}

function itemCreateData(inputs: RiskAssessmentItemInput[]) {
  return inputs.map((input, index) => {
    const riskScore = computeRiskScore(input.likelihood, input.severity);
    const riskLevel = computeRiskLevel(riskScore);
    const hasResidual = input.residualLikelihood !== null && input.residualSeverity !== null;
    const residualRiskScore = hasResidual ? computeRiskScore(input.residualLikelihood as number, input.residualSeverity as number) : null;
    const residualRiskLevel = residualRiskScore !== null ? computeRiskLevel(residualRiskScore) : null;

    return {
      hazard: input.hazard,
      whoMightBeHarmed: input.whoMightBeHarmed,
      existingControls: input.existingControls,
      likelihood: input.likelihood,
      severity: input.severity,
      riskScore,
      riskLevel,
      additionalControls: input.additionalControls,
      residualLikelihood: input.residualLikelihood,
      residualSeverity: input.residualSeverity,
      residualRiskScore,
      residualRiskLevel,
      order: input.order ?? index,
    };
  });
}

const WITH_ITEMS = { orderBy: { order: 'asc' as const } };

export async function listRiskAssessments(workplace?: { equals: string; mode: 'insensitive' }): Promise<RiskAssessment[]> {
  const rows = await prisma.riskAssessment.findMany({
    where: workplace ? { workplace } : undefined,
    orderBy: { assessmentDate: 'desc' },
    include: { items: WITH_ITEMS },
  });
  return rows.map((row) => fromRow(row, row.items));
}

export async function getRiskAssessmentDetail(id: string): Promise<RiskAssessmentDetail | undefined> {
  const row = await prisma.riskAssessment.findUnique({
    where: { id },
    include: { items: WITH_ITEMS, activity: { orderBy: { createdAt: 'asc' } } },
  });
  if (!row) return undefined;

  return { ...fromRow(row, row.items), activity: row.activity.map(activityFromRow) };
}

export async function createRiskAssessment(input: CreateRiskAssessmentInput): Promise<RiskAssessment> {
  const now = new Date();

  const row = await prisma.riskAssessment.create({
    data: {
      referenceNumber: await nextReferenceNumber(),
      title: input.title,
      assessmentType: input.assessmentType,
      description: input.description,
      workplace: input.workplace,
      department: input.department,
      location: input.location,
      status: 'Draft',
      assessedBy: input.assessedBy,
      approvedBy: '',
      assessmentDate: new Date(input.assessmentDate),
      nextReviewDate: input.nextReviewDate ? new Date(input.nextReviewDate) : null,
      createdAt: now,
      updatedAt: now,
      items: { create: itemCreateData(input.items) },
      activity: { create: { type: 'created', message: 'Risk assessment created.', actor: input.assessedBy, createdAt: now } },
    },
    include: { items: WITH_ITEMS },
  });

  return fromRow(row, row.items);
}

/** Replaces the whole item list — the builder freely adds/removes/reorders items in one save. */
async function replaceItems(riskAssessmentId: string, items: RiskAssessmentItemInput[]): Promise<void> {
  await prisma.riskAssessmentItem.deleteMany({ where: { riskAssessmentId } });
  for (const data of itemCreateData(items)) {
    await prisma.riskAssessmentItem.create({ data: { ...data, riskAssessmentId } });
  }
}

export async function updateRiskAssessment(id: string, input: UpdateRiskAssessmentInput): Promise<RiskAssessmentDetail | undefined> {
  const existing = await prisma.riskAssessment.findUnique({ where: { id } });
  if (!existing) return undefined;

  const now = new Date();
  const actor = input.actor && input.actor.length > 0 ? input.actor : existing.assessedBy || 'Safety Officer';
  const nextStatus = input.status;

  if (input.items) {
    await replaceItems(id, input.items);
  }

  const fieldChanges: Record<string, unknown> = {};
  if (input.title !== undefined) fieldChanges.title = input.title;
  if (input.assessmentType !== undefined) fieldChanges.assessmentType = input.assessmentType;
  if (input.description !== undefined) fieldChanges.description = input.description;
  if (input.workplace !== undefined) fieldChanges.workplace = input.workplace;
  if (input.department !== undefined) fieldChanges.department = input.department;
  if (input.location !== undefined) fieldChanges.location = input.location;
  if (input.assessedBy !== undefined) fieldChanges.assessedBy = input.assessedBy;
  if (input.approvedBy !== undefined) fieldChanges.approvedBy = input.approvedBy;
  if (input.assessmentDate !== undefined) fieldChanges.assessmentDate = new Date(input.assessmentDate);
  if (input.nextReviewDate !== undefined) fieldChanges.nextReviewDate = input.nextReviewDate ? new Date(input.nextReviewDate) : null;
  if (input.items !== undefined) fieldChanges.items = true; // tracked for the activity message only

  await prisma.riskAssessment.update({
    where: { id },
    data: {
      title: input.title ?? existing.title,
      assessmentType: input.assessmentType ?? existing.assessmentType,
      description: input.description ?? existing.description,
      workplace: input.workplace ?? existing.workplace,
      department: input.department ?? existing.department,
      location: input.location ?? existing.location,
      status: nextStatus ?? existing.status,
      assessedBy: input.assessedBy ?? existing.assessedBy,
      approvedBy: input.approvedBy ?? existing.approvedBy,
      assessmentDate: input.assessmentDate ? new Date(input.assessmentDate) : existing.assessmentDate,
      nextReviewDate: input.nextReviewDate !== undefined ? (input.nextReviewDate ? new Date(input.nextReviewDate) : null) : existing.nextReviewDate,
      updatedAt: now,
    },
  });

  if (nextStatus && nextStatus !== existing.status) {
    await prisma.riskAssessmentActivityEntry.create({
      data: { riskAssessmentId: id, type: 'status_change', message: `Status changed from ${existing.status} to ${nextStatus}.`, actor, createdAt: now },
    });
  }

  const changedFieldNames = Object.keys(fieldChanges);
  if (changedFieldNames.length > 0) {
    await prisma.riskAssessmentActivityEntry.create({
      data: { riskAssessmentId: id, type: 'updated', message: `Risk assessment updated (${changedFieldNames.join(', ')}).`, actor, createdAt: now },
    });
  }

  return getRiskAssessmentDetail(id);
}

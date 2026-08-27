import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import { validateHazardLink, sourceLinkErrorMessage } from '../../lib/sourceLinks';
import { computeRiskLevel, computeRiskScore, highestRiskLevel, type RiskLevel } from './riskMatrix';
import type { PaginationRequest } from '../../lib/pagination';
import type {
  RiskAssessment as PrismaRiskAssessment,
  RiskAssessmentActivityEntry as PrismaRiskAssessmentActivityEntry,
  RiskAssessmentItem as PrismaRiskAssessmentItem,
  Prisma,
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
    hazardId: row.hazardId,
    hazardReferenceNumber: row.hazardReferenceNumber,
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

export interface ListRiskAssessmentsFilter {
  hazardId?: string;
  workplace?: { equals: string; mode: 'insensitive' };
  status?: RiskAssessmentStatus;
  /** Exact (case-insensitive) match against `assessedBy`. */
  assignedTo?: { equals: string; mode: 'insensitive' };
  /** `overallRiskLevel` is computed from child items, not a stored column (see `fromRow`),
   * so it can't be pushed into a Prisma `where`. Filtering by it means fetching every row
   * matching the other filters first, then filtering/paginating in memory below — a
   * deliberate, bounded exception, not a missed optimization. */
  riskLevel?: RiskLevel;
  search?: string;
  sort?: 'newest' | 'oldest';
  pagination?: PaginationRequest;
}

function buildWhere(filter: ListRiskAssessmentsFilter): Prisma.RiskAssessmentWhereInput {
  const conditions: Prisma.RiskAssessmentWhereInput[] = [];
  if (filter.hazardId) conditions.push({ hazardId: filter.hazardId });
  if (filter.workplace) conditions.push({ workplace: filter.workplace });
  if (filter.status) conditions.push({ status: filter.status });
  if (filter.assignedTo) conditions.push({ assessedBy: filter.assignedTo });
  if (filter.search) {
    const search = filter.search.trim();
    if (search) {
      conditions.push({
        OR: [
          { referenceNumber: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { workplace: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
  }
  return conditions.length > 0 ? { AND: conditions } : {};
}

export async function listRiskAssessments(
  filter: ListRiskAssessmentsFilter = {},
): Promise<{ items: RiskAssessment[]; total: number }> {
  const where = buildWhere(filter);
  const orderBy: Prisma.RiskAssessmentOrderByWithRelationInput = { assessmentDate: filter.sort === 'oldest' ? 'asc' : 'desc' };

  if (filter.riskLevel) {
    const rows = await prisma.riskAssessment.findMany({ where, orderBy, include: { items: WITH_ITEMS } });
    const all = rows.map((row) => fromRow(row, row.items)).filter((a) => a.overallRiskLevel === filter.riskLevel);
    const total = all.length;
    const items = filter.pagination ? all.slice(filter.pagination.skip, filter.pagination.skip + filter.pagination.take) : all;
    return { items, total };
  }

  if (filter.pagination) {
    const [rows, total] = await Promise.all([
      prisma.riskAssessment.findMany({ where, orderBy, skip: filter.pagination.skip, take: filter.pagination.take, include: { items: WITH_ITEMS } }),
      prisma.riskAssessment.count({ where }),
    ]);
    return { items: rows.map((row) => fromRow(row, row.items)), total };
  }

  const rows = await prisma.riskAssessment.findMany({ where, orderBy, include: { items: WITH_ITEMS } });
  return { items: rows.map((row) => fromRow(row, row.items)), total: rows.length };
}

export async function getRiskAssessmentDetail(id: string): Promise<RiskAssessmentDetail | undefined> {
  const row = await prisma.riskAssessment.findUnique({
    where: { id },
    include: { items: WITH_ITEMS, activity: { orderBy: { createdAt: 'asc' } } },
  });
  if (!row) return undefined;

  return { ...fromRow(row, row.items), activity: row.activity.map(activityFromRow) };
}

export async function createRiskAssessment(input: CreateRiskAssessmentInput): Promise<RiskAssessment | { error: string }> {
  if (input.hazardId) {
    const result = await validateHazardLink(input.hazardId, input.workplace);
    if (typeof result === 'string') return { error: sourceLinkErrorMessage(result, 'hazard report') };
  }

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
      hazardId: input.hazardId,
      hazardReferenceNumber: input.hazardReferenceNumber,
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

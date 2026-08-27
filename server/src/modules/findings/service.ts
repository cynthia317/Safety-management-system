import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import { validateHazardLink, validateInspectionLink, sourceLinkErrorMessage } from '../../lib/sourceLinks';
import { RISK_RANK, reorderByIds, sortAndPageByRank } from '../../lib/rankSort';
import type { PaginationRequest } from '../../lib/pagination';
import type {
  Finding as PrismaFinding,
  FindingActivityEntry as PrismaFindingActivityEntry,
  FindingComment as PrismaFindingComment,
  Prisma,
} from '@prisma/client';
import type {
  CreateFindingCommentInput,
  CreateFindingFromResponseInput,
  CreateFindingInput,
  Finding,
  FindingActivityEntry,
  FindingActivityType,
  FindingComment,
  FindingDetail,
  FindingStatus,
  RiskLevel,
  UpdateFindingInput,
} from './types';

async function nextReferenceNumber(): Promise<string> {
  const value = await nextCounterValue('finding', 231);
  return `FND-${String(value).padStart(4, '0')}`;
}

function fromRow(row: PrismaFinding): Finding {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    title: row.title,
    description: row.description,
    workplace: row.workplace,
    department: row.department,
    location: row.location,
    riskLevel: row.riskLevel as RiskLevel,
    status: row.status as FindingStatus,
    hazardId: row.hazardId,
    hazardReferenceNumber: row.hazardReferenceNumber,
    inspectionId: row.inspectionId,
    inspectionReferenceNumber: row.inspectionReferenceNumber,
    questionResponseId: row.questionResponseId,
    createdBy: row.createdBy,
    assignedTo: row.assignedTo,
    dueDate: row.dueDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function activityFromRow(row: PrismaFindingActivityEntry): FindingActivityEntry {
  return {
    id: row.id,
    findingId: row.findingId,
    type: row.type as FindingActivityType,
    message: row.message,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

function commentFromRow(row: PrismaFindingComment): FindingComment {
  return { id: row.id, findingId: row.findingId, author: row.author, message: row.message, createdAt: row.createdAt.toISOString() };
}

export interface ListFindingsFilter {
  hazardId?: string;
  inspectionId?: string;
  workplace?: { equals: string; mode: 'insensitive' };
  status?: FindingStatus;
  riskLevel?: RiskLevel;
  assignedTo?: { equals: string; mode: 'insensitive' };
  overdue?: boolean;
  /** Ignored if `status` (an exact single status) is also given. */
  openOnly?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'dueDate' | 'risk';
  pagination?: PaginationRequest;
}

function buildWhere(filter: ListFindingsFilter): Prisma.FindingWhereInput {
  const conditions: Prisma.FindingWhereInput[] = [];
  if (filter.hazardId) conditions.push({ hazardId: filter.hazardId });
  if (filter.inspectionId) conditions.push({ inspectionId: filter.inspectionId });
  if (filter.workplace) conditions.push({ workplace: filter.workplace });
  if (filter.status) conditions.push({ status: filter.status });
  else if (filter.openOnly) conditions.push({ status: { not: 'Closed' } });
  if (filter.riskLevel) conditions.push({ riskLevel: filter.riskLevel });
  if (filter.assignedTo) conditions.push({ assignedTo: filter.assignedTo });
  if (filter.overdue) conditions.push({ status: { not: 'Closed' }, dueDate: { lt: new Date() } });
  if (filter.search) {
    const search = filter.search.trim();
    if (search) {
      conditions.push({
        OR: [
          { referenceNumber: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
  }
  return conditions.length > 0 ? { AND: conditions } : {};
}

export async function listFindings(filter: ListFindingsFilter = {}): Promise<{ items: Finding[]; total: number }> {
  const where = buildWhere(filter);

  if (filter.sort === 'risk') {
    const slim = await prisma.finding.findMany({ where, select: { id: true, riskLevel: true, dueDate: true } });
    const { ids, total } = sortAndPageByRank(
      slim,
      (r) => RISK_RANK[r.riskLevel as keyof typeof RISK_RANK],
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime(),
      filter.pagination,
    );
    const rows = await prisma.finding.findMany({ where: { id: { in: ids } } });
    return { items: reorderByIds(rows, ids).map(fromRow), total };
  }

  const orderBy: Prisma.FindingOrderByWithRelationInput =
    filter.sort === 'dueDate' ? { dueDate: 'asc' } : { createdAt: filter.sort === 'oldest' ? 'asc' : 'desc' };

  if (filter.pagination) {
    const [rows, total] = await Promise.all([
      prisma.finding.findMany({ where, orderBy, skip: filter.pagination.skip, take: filter.pagination.take }),
      prisma.finding.count({ where }),
    ]);
    return { items: rows.map(fromRow), total };
  }

  const rows = await prisma.finding.findMany({ where, orderBy });
  return { items: rows.map(fromRow), total: rows.length };
}

export async function getFindingDetail(id: string): Promise<FindingDetail | undefined> {
  const row = await prisma.finding.findUnique({
    where: { id },
    include: { activity: { orderBy: { createdAt: 'asc' } }, comments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!row) return undefined;

  return { ...fromRow(row), activity: row.activity.map(activityFromRow), comments: row.comments.map(commentFromRow) };
}

export async function createFinding(input: CreateFindingInput): Promise<Finding | { error: string }> {
  // hazardId/inspectionId are mutually exclusive already (enforced in schema.ts) — at
  // most one of these runs.
  if (input.hazardId) {
    const result = await validateHazardLink(input.hazardId, input.workplace);
    if (typeof result === 'string') return { error: sourceLinkErrorMessage(result, 'hazard report') };
  }
  if (input.inspectionId) {
    const result = await validateInspectionLink(input.inspectionId, input.workplace);
    if (typeof result === 'string') return { error: sourceLinkErrorMessage(result, 'inspection') };
  }

  const now = new Date();

  const row = await prisma.finding.create({
    data: {
      referenceNumber: await nextReferenceNumber(),
      status: 'Open',
      createdAt: now,
      updatedAt: now,
      ...input,
      activity: { create: { type: 'created', message: 'Finding created.', actor: input.createdBy, createdAt: now } },
    },
  });

  return fromRow(row);
}

export type CreateFindingFromResponseResult =
  | { ok: true; finding: Finding; reused: boolean }
  | { ok: false; error: 'INSPECTION_NOT_FOUND' | 'RESPONSE_NOT_FOUND' | 'NO_POTENTIAL_FINDING' };

/**
 * Turns a flagged inspection response into a real Finding, transactionally, and links
 * both directions: Finding.inspectionId/questionResponseId, and the response's
 * `potentialFinding.status` flips to 'Created'. Workplace/department/location are always
 * taken from the inspection itself — never client input — so there's no cross-workplace
 * value to validate here.
 *
 * De-duplication is two-layered: an upfront lookup returns the existing Finding if one is
 * already linked to this response (the normal "someone already did this" case), and the
 * `Finding.questionResponseId` unique constraint is the authoritative backstop against a
 * genuine race between two near-simultaneous requests — see the catch below.
 */
export async function createFindingFromInspectionResponse(
  inspectionId: string,
  questionId: string,
  input: CreateFindingFromResponseInput,
): Promise<CreateFindingFromResponseResult> {
  const inspection = await prisma.inspection.findUnique({ where: { id: inspectionId } });
  if (!inspection) return { ok: false, error: 'INSPECTION_NOT_FOUND' };

  const response = await prisma.questionResponse.findUnique({
    where: { inspectionId_questionId: { inspectionId, questionId } },
  });
  if (!response) return { ok: false, error: 'RESPONSE_NOT_FOUND' };
  if (!response.potentialFinding) return { ok: false, error: 'NO_POTENTIAL_FINDING' };

  const existingFinding = await prisma.finding.findUnique({ where: { questionResponseId: response.id } });
  if (existingFinding) {
    return { ok: true, finding: fromRow(existingFinding), reused: true };
  }

  const now = new Date();
  const referenceNumber = await nextReferenceNumber();
  const potentialFinding = response.potentialFinding as Record<string, unknown>;

  try {
    const created = await prisma.$transaction(async (tx) => {
      const finding = await tx.finding.create({
        data: {
          referenceNumber,
          title: input.title,
          description: input.description,
          workplace: inspection.workplace,
          department: inspection.area,
          location: inspection.specificLocation,
          riskLevel: input.riskLevel,
          status: 'Open',
          inspectionId: inspection.id,
          inspectionReferenceNumber: inspection.referenceNumber,
          questionResponseId: response.id,
          createdBy: input.createdBy,
          assignedTo: input.assignedTo,
          dueDate: new Date(input.dueDate),
          createdAt: now,
          updatedAt: now,
          activity: {
            create: {
              type: 'created',
              message: `Finding created from inspection ${inspection.referenceNumber}.`,
              actor: input.createdBy,
              createdAt: now,
            },
          },
        },
      });

      await tx.questionResponse.update({
        where: { id: response.id },
        data: { potentialFinding: { ...potentialFinding, status: 'Created' } },
      });

      await tx.inspectionActivityEntry.create({
        data: {
          inspectionId: inspection.id,
          type: 'finding_created',
          message: `Finding ${finding.referenceNumber} created from a flagged response.`,
          actor: input.createdBy,
          createdAt: now,
        },
      });

      return finding;
    });

    return { ok: true, finding: fromRow(created), reused: false };
  } catch (err) {
    // P2002 = unique constraint violation on questionResponseId — a concurrent request
    // won the race and created the Finding first. Reuse it instead of erroring.
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'P2002') {
      const winner = await prisma.finding.findUnique({ where: { questionResponseId: response.id } });
      if (winner) return { ok: true, finding: fromRow(winner), reused: true };
    }
    throw err;
  }
}

// Caller (controller) has already fetched and 404-checked the record, so `existing` is
// passed in rather than re-queried here — saves a redundant round trip on every update.
export async function updateFinding(
  id: string,
  existing: FindingDetail,
  input: UpdateFindingInput,
): Promise<FindingDetail | undefined> {
  const now = new Date();
  const actor = input.actor && input.actor.length > 0 ? input.actor : 'Safety Officer';
  const nextStatus = input.status;

  const fieldChanges: Record<string, unknown> = {};
  if (input.title !== undefined) fieldChanges.title = input.title;
  if (input.description !== undefined) fieldChanges.description = input.description;
  if (input.workplace !== undefined) fieldChanges.workplace = input.workplace;
  if (input.department !== undefined) fieldChanges.department = input.department;
  if (input.location !== undefined) fieldChanges.location = input.location;
  if (input.riskLevel !== undefined) fieldChanges.riskLevel = input.riskLevel;
  if (input.assignedTo !== undefined) fieldChanges.assignedTo = input.assignedTo;
  if (input.dueDate !== undefined) fieldChanges.dueDate = new Date(input.dueDate);

  await prisma.finding.update({
    where: { id },
    data: { ...fieldChanges, status: nextStatus ?? existing.status, updatedAt: now },
  });

  if (nextStatus && nextStatus !== existing.status) {
    await prisma.findingActivityEntry.create({
      data: { findingId: id, type: 'status_change', message: `Status changed from ${existing.status} to ${nextStatus}.`, actor, createdAt: now },
    });
  }

  const changedFieldNames = Object.keys(fieldChanges);
  if (changedFieldNames.length > 0) {
    await prisma.findingActivityEntry.create({
      data: { findingId: id, type: 'updated', message: `Finding details updated (${changedFieldNames.join(', ')}).`, actor, createdAt: now },
    });
  }

  return getFindingDetail(id);
}

// Caller (controller) has already fetched and 404-checked the record.
export async function addComment(id: string, input: CreateFindingCommentInput): Promise<FindingComment> {
  const now = new Date();
  const row = await prisma.findingComment.create({ data: { findingId: id, author: input.author, message: input.message, createdAt: now } });

  await prisma.findingActivityEntry.create({
    data: { findingId: id, type: 'comment', message: `${input.author} added a comment.`, actor: input.author, createdAt: now },
  });

  return commentFromRow(row);
}

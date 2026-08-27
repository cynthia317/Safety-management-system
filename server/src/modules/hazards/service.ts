import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import { OPEN_STATUSES, REVIEW_SLA_HOURS } from '../../lib/hazardSla';
import { RISK_RANK, reorderByIds, sortAndPageByRank } from '../../lib/rankSort';
import type { PaginationRequest } from '../../lib/pagination';
import type {
  HazardActivityEntry as PrismaHazardActivityEntry,
  HazardComment as PrismaHazardComment,
  HazardEvidenceItem as PrismaHazardEvidenceItem,
  HazardReport as PrismaHazardReport,
  Prisma,
} from '@prisma/client';
import type {
  CreateCommentInput,
  CreateHazardInput,
  HazardActivityEntry,
  HazardActivityType,
  HazardCategory,
  HazardComment,
  HazardDetail,
  HazardEvidenceItem,
  HazardReport,
  HazardStatus,
  ReportType,
  RiskLevel,
  UpdateHazardInput,
} from './types';

async function nextReferenceNumber(): Promise<string> {
  const value = await nextCounterValue('hazard', 1042);
  return `HZ-${value}`;
}

function fromRow(row: PrismaHazardReport): HazardReport {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    title: row.title,
    description: row.description,
    reportType: row.reportType as ReportType,
    hazardCategory: row.hazardCategory as HazardCategory,
    workplace: row.workplace,
    department: row.department,
    location: row.location,
    peopleAtRisk: row.peopleAtRisk,
    immediateActionTaken: row.immediateActionTaken,
    riskLevel: row.riskLevel as RiskLevel,
    status: row.status as HazardStatus,
    reportedBy: row.reportedBy,
    assignedTo: row.assignedTo,
    reportedAt: row.reportedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function activityFromRow(row: PrismaHazardActivityEntry): HazardActivityEntry {
  return {
    id: row.id,
    hazardId: row.hazardId,
    type: row.type as HazardActivityType,
    message: row.message,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

function commentFromRow(row: PrismaHazardComment): HazardComment {
  return { id: row.id, hazardId: row.hazardId, author: row.author, message: row.message, createdAt: row.createdAt.toISOString() };
}

function evidenceFromRow(row: PrismaHazardEvidenceItem): HazardEvidenceItem {
  return {
    id: row.id,
    hazardId: row.hazardId,
    fileName: row.fileName,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    dataUrl: row.dataUrl,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export interface ListHazardsFilter {
  workplace?: { equals: string; mode: 'insensitive' };
  status?: HazardStatus;
  riskLevel?: RiskLevel;
  hazardCategory?: string;
  reportedAfter?: Date;
  /** `''` (empty string) matches only unassigned reports — distinct from `assignedTo`
   * above, which matches a specific name. */
  unassignedOnly?: boolean;
  /** Exact (case-insensitive) match against `assignedTo` — 'me' is resolved to the caller's
   * name by the controller before this filter is built. */
  assignedTo?: { equals: string; mode: 'insensitive' };
  overdue?: boolean;
  /** Status is one of the three non-closed statuses (New / Under Review / Action Required)
   * — the same "open" definition the dashboard has always used. Ignored if `status` (an
   * exact single status) is also given. */
  openOnly?: boolean;
  search?: string;
  sort?: 'newest' | 'oldest' | 'risk';
  pagination?: PaginationRequest;
}

/** Reproduces `isHazardOverdue` (lib/hazardSla.ts) as a Prisma `where` fragment — one OR
 * branch per risk level's own SLA threshold — rather than fetching every open hazard and
 * filtering in JS, since a hazard has no stored `dueDate` to filter on directly. */
function hazardOverdueWhere(now: Date): Prisma.HazardReportWhereInput {
  return {
    status: { in: OPEN_STATUSES },
    OR: (Object.keys(REVIEW_SLA_HOURS) as RiskLevel[]).map((level) => ({
      riskLevel: level,
      reportedAt: { lt: new Date(now.getTime() - REVIEW_SLA_HOURS[level] * 60 * 60 * 1000) },
    })),
  };
}

function buildWhere(filter: ListHazardsFilter): Prisma.HazardReportWhereInput {
  const conditions: Prisma.HazardReportWhereInput[] = [];
  if (filter.workplace) conditions.push({ workplace: filter.workplace });
  if (filter.status) conditions.push({ status: filter.status });
  else if (filter.openOnly) conditions.push({ status: { in: OPEN_STATUSES } });
  if (filter.riskLevel) conditions.push({ riskLevel: filter.riskLevel });
  if (filter.unassignedOnly) conditions.push({ assignedTo: '' });
  else if (filter.assignedTo) conditions.push({ assignedTo: filter.assignedTo });
  if (filter.overdue) conditions.push(hazardOverdueWhere(new Date()));
  if (filter.hazardCategory) conditions.push({ hazardCategory: filter.hazardCategory });
  if (filter.reportedAfter) conditions.push({ reportedAt: { gte: filter.reportedAfter } });
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

export async function listHazards(filter: ListHazardsFilter = {}): Promise<{ items: HazardReport[]; total: number }> {
  const where = buildWhere(filter);

  if (filter.sort === 'risk') {
    const slim = await prisma.hazardReport.findMany({ where, select: { id: true, riskLevel: true, reportedAt: true } });
    const { ids, total } = sortAndPageByRank(
      slim,
      (r) => RISK_RANK[r.riskLevel as keyof typeof RISK_RANK],
      (a, b) => b.reportedAt.getTime() - a.reportedAt.getTime(),
      filter.pagination,
    );
    const rows = await prisma.hazardReport.findMany({ where: { id: { in: ids } } });
    return { items: reorderByIds(rows, ids).map(fromRow), total };
  }

  const orderBy: Prisma.HazardReportOrderByWithRelationInput = { reportedAt: filter.sort === 'oldest' ? 'asc' : 'desc' };

  if (filter.pagination) {
    const [rows, total] = await Promise.all([
      prisma.hazardReport.findMany({ where, orderBy, skip: filter.pagination.skip, take: filter.pagination.take }),
      prisma.hazardReport.count({ where }),
    ]);
    return { items: rows.map(fromRow), total };
  }

  const rows = await prisma.hazardReport.findMany({ where, orderBy });
  return { items: rows.map(fromRow), total: rows.length };
}

export async function getHazardDetail(id: string): Promise<HazardDetail | undefined> {
  const row = await prisma.hazardReport.findUnique({
    where: { id },
    include: {
      activity: { orderBy: { createdAt: 'asc' } },
      comments: { orderBy: { createdAt: 'asc' } },
      evidence: true,
    },
  });
  if (!row) return undefined;

  return {
    ...fromRow(row),
    activity: row.activity.map(activityFromRow),
    comments: row.comments.map(commentFromRow),
    evidence: row.evidence.map(evidenceFromRow),
  };
}

export async function createHazard(input: CreateHazardInput): Promise<HazardReport> {
  const now = new Date();
  const { evidence, ...reportFields } = input;

  const row = await prisma.hazardReport.create({
    data: {
      referenceNumber: await nextReferenceNumber(),
      status: 'New',
      reportedAt: now,
      updatedAt: now,
      ...reportFields,
      activity: {
        create: { type: 'created', message: 'Hazard report submitted.', actor: input.reportedBy, createdAt: now },
      },
      evidence: {
        create: evidence.map((item) => ({
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          dataUrl: item.dataUrl,
          uploadedBy: input.reportedBy,
          uploadedAt: now,
        })),
      },
    },
  });

  return fromRow(row);
}

// Caller (controller) has already fetched and 404-checked the record, so `existing` is
// passed in rather than re-queried here — saves a redundant round trip on every update.
export async function updateHazard(
  id: string,
  existing: HazardDetail,
  input: UpdateHazardInput,
): Promise<HazardDetail | undefined> {
  const now = new Date();
  const actor = input.actor && input.actor.length > 0 ? input.actor : 'Safety Officer';
  const nextStatus = input.status;

  const fieldChanges: Record<string, unknown> = {};
  if (input.title !== undefined) fieldChanges.title = input.title;
  if (input.description !== undefined) fieldChanges.description = input.description;
  if (input.reportType !== undefined) fieldChanges.reportType = input.reportType;
  if (input.hazardCategory !== undefined) fieldChanges.hazardCategory = input.hazardCategory;
  if (input.workplace !== undefined) fieldChanges.workplace = input.workplace;
  if (input.department !== undefined) fieldChanges.department = input.department;
  if (input.location !== undefined) fieldChanges.location = input.location;
  if (input.peopleAtRisk !== undefined) fieldChanges.peopleAtRisk = input.peopleAtRisk;
  if (input.immediateActionTaken !== undefined) fieldChanges.immediateActionTaken = input.immediateActionTaken;
  if (input.riskLevel !== undefined) fieldChanges.riskLevel = input.riskLevel;
  if (input.assignedTo !== undefined) fieldChanges.assignedTo = input.assignedTo;

  await prisma.hazardReport.update({
    where: { id },
    data: { ...fieldChanges, status: nextStatus ?? existing.status, updatedAt: now },
  });

  if (nextStatus && nextStatus !== existing.status) {
    await prisma.hazardActivityEntry.create({
      data: { hazardId: id, type: 'status_change', message: `Status changed from ${existing.status} to ${nextStatus}.`, actor, createdAt: now },
    });
  }

  const changedFieldNames = Object.keys(fieldChanges);
  if (changedFieldNames.length > 0) {
    await prisma.hazardActivityEntry.create({
      data: { hazardId: id, type: 'updated', message: `Report details updated (${changedFieldNames.join(', ')}).`, actor, createdAt: now },
    });
  }

  return getHazardDetail(id);
}

// Caller (controller) has already fetched and 404-checked the record.
export async function addComment(id: string, input: CreateCommentInput): Promise<HazardComment> {
  const now = new Date();
  const row = await prisma.hazardComment.create({ data: { hazardId: id, author: input.author, message: input.message, createdAt: now } });

  await prisma.hazardActivityEntry.create({
    data: { hazardId: id, type: 'comment', message: `${input.author} added a comment.`, actor: input.author, createdAt: now },
  });

  return commentFromRow(row);
}

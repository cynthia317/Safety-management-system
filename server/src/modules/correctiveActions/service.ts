import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import { queueNotification } from '../notifications/service';
import {
  validateFindingLink,
  validateHazardLink,
  validateInspectionLink,
  validateRiskAssessmentLink,
  sourceLinkErrorMessage,
} from '../../lib/sourceLinks';
import type {
  CorrectiveAction as PrismaCorrectiveAction,
  CorrectiveActionActivityEntry as PrismaCorrectiveActionActivityEntry,
  CorrectiveActionComment as PrismaCorrectiveActionComment,
  CorrectiveActionEvidenceItem as PrismaCorrectiveActionEvidenceItem,
  Prisma,
} from '@prisma/client';
import type {
  CorrectiveAction,
  CorrectiveActionActivityEntry,
  CorrectiveActionActivityType,
  CorrectiveActionComment,
  CorrectiveActionDetail,
  CorrectiveActionEvidenceItem,
  CorrectiveActionSourceType,
  CorrectiveActionStats,
  CorrectiveActionStatus,
  CreateCorrectiveActionCommentInput,
  CreateCorrectiveActionInput,
  EvidenceInput,
  RiskLevel,
  UpdateCorrectiveActionInput,
} from './types';

async function nextReferenceNumber(): Promise<string> {
  const value = await nextCounterValue('correctiveAction', 511);
  return `CA-${String(value).padStart(4, '0')}`;
}

function fromRow(row: PrismaCorrectiveAction): CorrectiveAction {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    title: row.title,
    description: row.description,
    workplace: row.workplace,
    department: row.department,
    location: row.location,
    priority: row.priority as RiskLevel,
    status: row.status as CorrectiveActionStatus,
    sourceType: row.sourceType as CorrectiveActionSourceType,
    findingId: row.findingId,
    findingReferenceNumber: row.findingReferenceNumber,
    hazardId: row.hazardId,
    hazardReferenceNumber: row.hazardReferenceNumber,
    inspectionId: row.inspectionId,
    inspectionReferenceNumber: row.inspectionReferenceNumber,
    riskAssessmentId: row.riskAssessmentId,
    riskAssessmentReferenceNumber: row.riskAssessmentReferenceNumber,
    externalSourceReference: row.externalSourceReference,
    createdBy: row.createdBy,
    assignedTo: row.assignedTo,
    dueDate: row.dueDate.toISOString(),
    responseNote: row.responseNote,
    respondedAt: row.respondedAt ? row.respondedAt.toISOString() : null,
    evidenceNote: row.evidenceNote,
    verifiedBy: row.verifiedBy,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    closedAt: row.closedAt ? row.closedAt.toISOString() : null,
  };
}

function activityFromRow(row: PrismaCorrectiveActionActivityEntry): CorrectiveActionActivityEntry {
  return {
    id: row.id,
    correctiveActionId: row.correctiveActionId,
    type: row.type as CorrectiveActionActivityType,
    message: row.message,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

function commentFromRow(row: PrismaCorrectiveActionComment): CorrectiveActionComment {
  return {
    id: row.id,
    correctiveActionId: row.correctiveActionId,
    author: row.author,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

function evidenceFromRow(row: PrismaCorrectiveActionEvidenceItem): CorrectiveActionEvidenceItem {
  return {
    id: row.id,
    correctiveActionId: row.correctiveActionId,
    fileName: row.fileName,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    dataUrl: row.dataUrl,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export interface ListCorrectiveActionsFilter {
  hazardId?: string;
  findingIds?: string[];
  inspectionId?: string;
  riskAssessmentId?: string;
  workplace?: { equals: string; mode: 'insensitive' };
}

export async function listCorrectiveActions(filter: ListCorrectiveActionsFilter = {}): Promise<CorrectiveAction[]> {
  const sourceConditions: Prisma.CorrectiveActionWhereInput[] = [];
  if (filter.hazardId) sourceConditions.push({ hazardId: filter.hazardId });
  if (filter.findingIds && filter.findingIds.length > 0) sourceConditions.push({ findingId: { in: filter.findingIds } });
  if (filter.inspectionId) sourceConditions.push({ inspectionId: filter.inspectionId });
  if (filter.riskAssessmentId) sourceConditions.push({ riskAssessmentId: filter.riskAssessmentId });

  const where: Prisma.CorrectiveActionWhereInput = {};
  if (sourceConditions.length > 0) where.OR = sourceConditions;
  if (filter.workplace) where.workplace = filter.workplace;

  const rows = await prisma.correctiveAction.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(fromRow);
}

export async function getCorrectiveActionDetail(id: string): Promise<CorrectiveActionDetail | undefined> {
  const row = await prisma.correctiveAction.findUnique({
    where: { id },
    include: {
      activity: { orderBy: { createdAt: 'asc' } },
      comments: { orderBy: { createdAt: 'asc' } },
      evidence: { orderBy: { uploadedAt: 'asc' } },
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

// Mutual exclusivity of findingId/hazardId/inspectionId/riskAssessmentId is already
// enforced in schema.ts — at most one of these branches runs.
async function resolveSourceType(input: CreateCorrectiveActionInput): Promise<CorrectiveActionSourceType | { error: string }> {
  if (input.findingId) {
    const result = await validateFindingLink(input.findingId, input.workplace);
    if (typeof result === 'string') return { error: sourceLinkErrorMessage(result, 'finding') };
    return 'Finding';
  }
  if (input.hazardId) {
    const result = await validateHazardLink(input.hazardId, input.workplace);
    if (typeof result === 'string') return { error: sourceLinkErrorMessage(result, 'hazard report') };
    return 'Hazard Report';
  }
  if (input.inspectionId) {
    const result = await validateInspectionLink(input.inspectionId, input.workplace);
    if (typeof result === 'string') return { error: sourceLinkErrorMessage(result, 'inspection') };
    return 'Inspection';
  }
  if (input.riskAssessmentId) {
    const result = await validateRiskAssessmentLink(input.riskAssessmentId, input.workplace);
    if (typeof result === 'string') return { error: sourceLinkErrorMessage(result, 'risk assessment') };
    return 'Risk Assessment';
  }
  // No relational link — keep whatever the client selected (Manual Entry, Audit,
  // Incident, or a legacy External reference), since those sources have no FK to check.
  return input.sourceType;
}

export async function createCorrectiveAction(input: CreateCorrectiveActionInput): Promise<CorrectiveAction | { error: string }> {
  const resolvedSourceType = await resolveSourceType(input);
  if (typeof resolvedSourceType === 'object') return resolvedSourceType;

  const now = new Date();
  const { evidence, ...fields } = input;

  const row = await prisma.correctiveAction.create({
    data: {
      referenceNumber: await nextReferenceNumber(),
      status: 'Assigned',
      responseNote: '',
      respondedAt: null,
      evidenceNote: '',
      verifiedBy: '',
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      ...fields,
      // Server-derived from whichever FK is actually set, so the displayed source type can
      // never drift from the real relational link — see resolveSourceType above.
      sourceType: resolvedSourceType,
      activity: { create: { type: 'created', message: 'Corrective action created.', actor: input.createdBy, createdAt: now } },
      evidence: {
        create: evidence.map((item) => ({
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          dataUrl: item.dataUrl,
          uploadedBy: input.createdBy,
          uploadedAt: now,
        })),
      },
    },
  });

  const action = fromRow(row);

  await queueNotification({
    type: 'corrective_action_assigned',
    recipient: action.assignedTo,
    subject: `Corrective action assigned: ${action.referenceNumber}`,
    message: `You have been assigned corrective action ${action.referenceNumber}: "${action.title}", due ${new Date(action.dueDate).toLocaleDateString()}.`,
    relatedEntityType: 'corrective_action',
    relatedEntityId: row.id,
    relatedEntityReference: action.referenceNumber,
  });

  return action;
}

// Callers (controllers) always fetch and 404-check the record before calling this, so
// `existing` is passed in rather than re-queried here — saves a redundant round trip to
// the database on every single update request.
export async function updateCorrectiveAction(
  id: string,
  existing: CorrectiveActionDetail,
  input: UpdateCorrectiveActionInput,
): Promise<CorrectiveActionDetail | undefined> {
  const now = new Date();
  const actor = input.actor && input.actor.length > 0 ? input.actor : 'Safety Officer';
  const nextStatus = input.status;

  const fieldChanges: Record<string, unknown> = {};
  if (input.title !== undefined) fieldChanges.title = input.title;
  if (input.description !== undefined) fieldChanges.description = input.description;
  if (input.workplace !== undefined) fieldChanges.workplace = input.workplace;
  if (input.department !== undefined) fieldChanges.department = input.department;
  if (input.location !== undefined) fieldChanges.location = input.location;
  if (input.priority !== undefined) fieldChanges.priority = input.priority;
  if (input.assignedTo !== undefined) fieldChanges.assignedTo = input.assignedTo;
  if (input.dueDate !== undefined) fieldChanges.dueDate = new Date(input.dueDate);

  if (input.responseNote !== undefined) {
    fieldChanges.responseNote = input.responseNote;
    fieldChanges.respondedAt = now;
  }
  if (input.evidenceNote !== undefined) fieldChanges.evidenceNote = input.evidenceNote;
  if (input.verifiedBy !== undefined) {
    fieldChanges.verifiedBy = input.verifiedBy;
    fieldChanges.verifiedAt = input.verifiedBy ? now : null;
  }

  if (nextStatus === 'Closed' && existing.status !== 'Closed') {
    fieldChanges.closedAt = now;
  } else if (nextStatus && nextStatus !== 'Closed' && existing.status === 'Closed') {
    fieldChanges.closedAt = null;
  }

  const updatedRow = await prisma.correctiveAction.update({
    where: { id },
    data: { ...fieldChanges, status: nextStatus ?? existing.status, updatedAt: now },
  });
  const updated = fromRow(updatedRow);

  if (nextStatus && nextStatus !== existing.status) {
    await prisma.correctiveActionActivityEntry.create({
      data: { correctiveActionId: id, type: 'status_change', message: `Status changed from ${existing.status} to ${nextStatus}.`, actor, createdAt: now },
    });

    if (nextStatus === 'Awaiting Verification') {
      await queueNotification({
        type: 'corrective_action_verification_requested',
        recipient: 'EHS Officer',
        subject: `Verification requested: ${updated.referenceNumber}`,
        message: `${actor} submitted a response for ${updated.referenceNumber}: "${updated.title}" and it is awaiting verification.`,
        relatedEntityType: 'corrective_action',
        relatedEntityId: id,
        relatedEntityReference: updated.referenceNumber,
      });
    }
  }

  const changedFieldNames = Object.keys(fieldChanges).filter(
    (f) => f !== 'respondedAt' && f !== 'verifiedAt' && f !== 'closedAt',
  );
  if (changedFieldNames.length > 0) {
    await prisma.correctiveActionActivityEntry.create({
      data: { correctiveActionId: id, type: 'updated', message: `Corrective action updated (${changedFieldNames.join(', ')}).`, actor, createdAt: now },
    });

    if (fieldChanges.assignedTo && fieldChanges.assignedTo !== existing.assignedTo) {
      await queueNotification({
        type: 'corrective_action_assigned',
        recipient: fieldChanges.assignedTo as string,
        subject: `Corrective action assigned: ${updated.referenceNumber}`,
        message: `You have been assigned corrective action ${updated.referenceNumber}: "${updated.title}", due ${new Date(updated.dueDate).toLocaleDateString()}.`,
        relatedEntityType: 'corrective_action',
        relatedEntityId: id,
        relatedEntityReference: updated.referenceNumber,
      });
    }
  }

  return getCorrectiveActionDetail(id);
}

// Caller (controller) has already fetched and 404-checked the record.
export async function addComment(id: string, input: CreateCorrectiveActionCommentInput): Promise<CorrectiveActionComment> {
  const now = new Date();
  const row = await prisma.correctiveActionComment.create({
    data: { correctiveActionId: id, author: input.author, message: input.message, createdAt: now },
  });

  await prisma.correctiveActionActivityEntry.create({
    data: { correctiveActionId: id, type: 'comment', message: `${input.author} added a comment.`, actor: input.author, createdAt: now },
  });

  return commentFromRow(row);
}

// Caller (controller) has already fetched and 404-checked the record.
export async function addEvidence(id: string, files: EvidenceInput[], uploadedBy: string): Promise<CorrectiveActionEvidenceItem[]> {
  const now = new Date();
  const created = await prisma.$transaction(
    files.map((file) =>
      prisma.correctiveActionEvidenceItem.create({
        data: {
          correctiveActionId: id,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          dataUrl: file.dataUrl,
          uploadedBy,
          uploadedAt: now,
        },
      }),
    ),
  );

  await prisma.correctiveAction.update({ where: { id }, data: { updatedAt: now } });

  await prisma.correctiveActionActivityEntry.create({
    data: {
      correctiveActionId: id,
      type: 'evidence_added',
      message: `${uploadedBy} attached ${created.length === 1 ? '1 file' : `${created.length} files`}.`,
      actor: uploadedBy,
      createdAt: now,
    },
  });

  return created.map(evidenceFromRow);
}

interface StatsRow {
  status: CorrectiveActionStatus;
  priority: RiskLevel;
  department: string;
  dueDate: Date;
  closedAt: Date | null;
  createdAt: Date;
}

function isOverdue(action: StatsRow, now: number): boolean {
  return action.status !== 'Closed' && action.dueDate.getTime() < now;
}

export async function getCorrectiveActionStats(workplace?: { equals: string; mode: 'insensitive' }): Promise<CorrectiveActionStats> {
  // Aggregation only needs these six columns, not the full row (title/description/notes
  // etc.) — selecting just these cuts the data pulled from and parsed off every row.
  const all = (await prisma.correctiveAction.findMany({
    where: workplace ? { workplace } : undefined,
    select: { status: true, priority: true, department: true, dueDate: true, closedAt: true, createdAt: true },
  })) as StatsRow[];
  const now = Date.now();
  const nowDate = new Date();

  const byStatus: CorrectiveActionStats['byStatus'] = {
    Assigned: 0,
    'In Progress': 0,
    'Awaiting Verification': 0,
    Verified: 0,
    Closed: 0,
  };
  const byPriority: CorrectiveActionStats['byPriority'] = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  const departmentCounts = new Map<string, number>();

  let overdueCount = 0;
  let closedThisMonth = 0;
  let criticalOpenCount = 0;
  let closureDaysTotal = 0;
  let closedWithDurationCount = 0;

  for (const action of all) {
    byStatus[action.status] += 1;
    byPriority[action.priority] += 1;
    departmentCounts.set(action.department, (departmentCounts.get(action.department) ?? 0) + 1);

    if (isOverdue(action, now)) overdueCount += 1;
    if (action.priority === 'Critical' && action.status !== 'Closed') criticalOpenCount += 1;

    if (action.status === 'Closed' && action.closedAt) {
      const closedDate = new Date(action.closedAt);
      if (closedDate.getFullYear() === nowDate.getFullYear() && closedDate.getMonth() === nowDate.getMonth()) {
        closedThisMonth += 1;
      }
      const durationDays = (closedDate.getTime() - new Date(action.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (durationDays >= 0) {
        closureDaysTotal += durationDays;
        closedWithDurationCount += 1;
      }
    }
  }

  const byDepartment = [...departmentCounts.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  const monthlyClosureTrend: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const monthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    const label = monthDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    const count = all.filter((action) => {
      if (action.status !== 'Closed' || !action.closedAt) return false;
      const closedDate = new Date(action.closedAt);
      return closedDate.getFullYear() === monthDate.getFullYear() && closedDate.getMonth() === monthDate.getMonth();
    }).length;
    monthlyClosureTrend.push({ month: label, count });
  }

  const totalActions = all.length;
  const totalClosed = byStatus.Closed;

  return {
    totalActions,
    byStatus,
    overdueCount,
    closedThisMonth,
    byDepartment,
    byPriority,
    monthlyClosureTrend,
    averageClosureDays: closedWithDurationCount > 0 ? Math.round((closureDaysTotal / closedWithDurationCount) * 10) / 10 : null,
    criticalOpenCount,
    closureRate: totalActions > 0 ? Math.round((totalClosed / totalActions) * 1000) / 10 : 0,
  };
}

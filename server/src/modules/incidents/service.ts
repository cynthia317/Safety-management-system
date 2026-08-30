import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import { validateHazardLink, sourceLinkErrorMessage } from '../../lib/sourceLinks';
import { isValidStatusTransition } from './schema';
import type { PaginationRequest } from '../../lib/pagination';
import type {
  Incident as PrismaIncident,
  IncidentActivityEntry as PrismaIncidentActivityEntry,
  IncidentComment as PrismaIncidentComment,
  IncidentEvidenceItem as PrismaIncidentEvidenceItem,
  Prisma,
} from '@prisma/client';
import type {
  CreateIncidentCommentInput,
  CreateIncidentInput,
  EventType,
  EvidenceInput,
  Incident,
  IncidentActivityEntry,
  IncidentActivityType,
  IncidentCategory,
  IncidentComment,
  IncidentDetail,
  IncidentEvidenceItem,
  IncidentStatus,
  InjurySeverity,
  Severity,
  UpdateIncidentInput,
} from './types';

// Corrective actions in either of these two statuses count as "resolved" for the purpose
// of an incident closure gate — this is the real current CorrectiveAction lifecycle
// (Assigned -> In Progress -> Awaiting Verification -> Verified -> Closed), not a
// dedicated "Incident closure" concept. A reopened action (moved back out of
// Verified/Closed) would correctly re-block closure if checked again.
const CORRECTIVE_ACTION_TERMINAL_STATUSES = ['Verified', 'Closed'];

async function nextReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const value = await nextCounterValue('incident', 0);
  return `INC-${year}-${String(value).padStart(4, '0')}`;
}

function fromRow(row: PrismaIncident): Incident {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    eventType: row.eventType as EventType,
    category: row.category as IncidentCategory,
    title: row.title,
    description: row.description,
    workplace: row.workplace,
    department: row.department,
    location: row.location,
    eventDate: row.eventDate.toISOString(),
    reportedBy: row.reportedBy,
    reportedAt: row.reportedAt.toISOString(),
    peopleInvolved: row.peopleInvolved,
    injuryOccurred: row.injuryOccurred,
    injurySeverity: row.injurySeverity as InjurySeverity | null,
    immediateActionTaken: row.immediateActionTaken,
    actualSeverity: row.actualSeverity as Severity,
    potentialSeverity: row.potentialSeverity as Severity,
    status: row.status as IncidentStatus,
    leadInvestigator: row.leadInvestigator,
    investigationSummary: row.investigationSummary,
    rootCause: row.rootCause,
    contributingFactors: row.contributingFactors,
    lessonsLearned: row.lessonsLearned,
    hazardId: row.hazardId,
    hazardReferenceNumber: row.hazardReferenceNumber,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function activityFromRow(row: PrismaIncidentActivityEntry): IncidentActivityEntry {
  return {
    id: row.id,
    incidentId: row.incidentId,
    type: row.type as IncidentActivityType,
    message: row.message,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

function commentFromRow(row: PrismaIncidentComment): IncidentComment {
  return { id: row.id, incidentId: row.incidentId, author: row.author, message: row.message, createdAt: row.createdAt.toISOString() };
}

function evidenceFromRow(row: PrismaIncidentEvidenceItem): IncidentEvidenceItem {
  return {
    id: row.id,
    incidentId: row.incidentId,
    fileName: row.fileName,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    dataUrl: row.dataUrl,
    uploadedBy: row.uploadedBy,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export interface ListIncidentsFilter {
  workplace?: { equals: string; mode: 'insensitive' };
  eventType?: EventType;
  category?: IncidentCategory;
  status?: IncidentStatus;
  /** Status not in (Resolved, Closed) — ignored if `status` (an exact single status) is
   * also given. Same "open" convention as every other module. */
  openOnly?: boolean;
  /** Exact match against `potentialSeverity`. */
  severity?: Severity;
  /** `potentialSeverity IN (High, Critical)` — the exact condition behind the "High-Potential
   * Events" dashboard card; kept separate from `severity` so the dashboard's OR'd population
   * and a plain single-value list filter never drift apart. */
  highPotential?: boolean;
  department?: { equals: string; mode: 'insensitive' };
  /** Exact (case-insensitive) match against `leadInvestigator`. */
  investigator?: { equals: string; mode: 'insensitive' };
  eventDateFrom?: Date;
  eventDateTo?: Date;
  search?: string;
  sort?: 'newest' | 'oldest';
  pagination?: PaginationRequest;
}

function buildWhere(filter: ListIncidentsFilter): Prisma.IncidentWhereInput {
  const conditions: Prisma.IncidentWhereInput[] = [];
  if (filter.workplace) conditions.push({ workplace: filter.workplace });
  if (filter.eventType) conditions.push({ eventType: filter.eventType });
  if (filter.category) conditions.push({ category: filter.category });
  if (filter.status) conditions.push({ status: filter.status });
  else if (filter.openOnly) conditions.push({ status: { notIn: ['Resolved', 'Closed'] } });
  if (filter.severity) conditions.push({ potentialSeverity: filter.severity });
  if (filter.highPotential) conditions.push({ potentialSeverity: { in: ['High', 'Critical'] } });
  if (filter.department) conditions.push({ department: filter.department });
  if (filter.investigator) conditions.push({ leadInvestigator: filter.investigator });
  if (filter.eventDateFrom) conditions.push({ eventDate: { gte: filter.eventDateFrom } });
  if (filter.eventDateTo) conditions.push({ eventDate: { lt: filter.eventDateTo } });
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

export async function listIncidents(filter: ListIncidentsFilter = {}): Promise<{ items: Incident[]; total: number }> {
  const where = buildWhere(filter);
  const orderBy: Prisma.IncidentOrderByWithRelationInput = { reportedAt: filter.sort === 'oldest' ? 'asc' : 'desc' };

  if (filter.pagination) {
    const [rows, total] = await Promise.all([
      prisma.incident.findMany({ where, orderBy, skip: filter.pagination.skip, take: filter.pagination.take }),
      prisma.incident.count({ where }),
    ]);
    return { items: rows.map(fromRow), total };
  }

  const rows = await prisma.incident.findMany({ where, orderBy });
  return { items: rows.map(fromRow), total: rows.length };
}

export async function getIncidentDetail(id: string): Promise<IncidentDetail | undefined> {
  const row = await prisma.incident.findUnique({
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

export async function createIncident(
  input: CreateIncidentInput,
  reportedBy: string,
): Promise<IncidentDetail | { error: string }> {
  let hazardReferenceNumber: string | null = null;
  if (input.hazardId) {
    const result = await validateHazardLink(input.hazardId, input.workplace);
    if (typeof result === 'string') return { error: sourceLinkErrorMessage(result, 'hazard report') };
    hazardReferenceNumber = result.referenceNumber;
  }

  const now = new Date();
  const { evidence, hazardId, ...fields } = input;

  const row = await prisma.incident.create({
    data: {
      referenceNumber: await nextReferenceNumber(),
      ...fields,
      hazardId,
      hazardReferenceNumber,
      status: 'Reported',
      reportedBy,
      reportedAt: now,
      leadInvestigator: '',
      investigationSummary: '',
      rootCause: '',
      contributingFactors: '',
      lessonsLearned: '',
      activity: { create: { type: 'created', message: 'Incident reported.', actor: reportedBy, createdAt: now } },
      evidence: {
        create: evidence.map((item) => ({
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          dataUrl: item.dataUrl,
          uploadedBy: reportedBy,
          uploadedAt: now,
        })),
      },
    },
    include: {
      activity: { orderBy: { createdAt: 'asc' } },
      comments: { orderBy: { createdAt: 'asc' } },
      evidence: { orderBy: { uploadedAt: 'asc' } },
    },
  });

  return {
    ...fromRow(row),
    activity: row.activity.map(activityFromRow),
    comments: row.comments.map(commentFromRow),
    evidence: row.evidence.map(evidenceFromRow),
  };
}

export type UpdateIncidentResult = { ok: true; incident: IncidentDetail } | { ok: false; error: string };

// Caller (controller) has already fetched and 404-checked the record, so `existing` is
// passed in rather than re-queried here.
export async function updateIncident(
  id: string,
  existing: IncidentDetail,
  input: UpdateIncidentInput,
): Promise<UpdateIncidentResult> {
  const now = new Date();
  const actor = input.actor && input.actor.length > 0 ? input.actor : 'Safety Officer';
  const nextStatus = input.status;

  if (nextStatus && nextStatus !== existing.status) {
    if (!isValidStatusTransition(existing.status, nextStatus)) {
      return { ok: false, error: `Cannot change status from "${existing.status}" to "${nextStatus}".` };
    }

    if (nextStatus === 'Closed') {
      const investigationSummary = input.investigationSummary ?? existing.investigationSummary;
      if (!investigationSummary.trim()) {
        return { ok: false, error: 'An investigation summary is required before closing an incident.' };
      }

      const openLinkedActions = await prisma.correctiveAction.count({
        where: { incidentId: id, status: { notIn: CORRECTIVE_ACTION_TERMINAL_STATUSES } },
      });
      if (openLinkedActions > 0) {
        return {
          ok: false,
          error: `${openLinkedActions} linked corrective action${openLinkedActions === 1 ? '' : 's'} must be Verified or Closed before this incident can be closed.`,
        };
      }
    }
  }

  let hazardReferenceNumber = existing.hazardReferenceNumber;
  if (input.hazardId !== undefined) {
    if (input.hazardId === null) {
      hazardReferenceNumber = null;
    } else {
      const result = await validateHazardLink(input.hazardId, input.workplace ?? existing.workplace);
      if (typeof result === 'string') return { ok: false, error: sourceLinkErrorMessage(result, 'hazard report') };
      hazardReferenceNumber = result.referenceNumber;
    }
  }

  const fieldChanges: Record<string, unknown> = {};
  if (input.eventType !== undefined) fieldChanges.eventType = input.eventType;
  if (input.category !== undefined) fieldChanges.category = input.category;
  if (input.title !== undefined) fieldChanges.title = input.title;
  if (input.description !== undefined) fieldChanges.description = input.description;
  if (input.workplace !== undefined) fieldChanges.workplace = input.workplace;
  if (input.department !== undefined) fieldChanges.department = input.department;
  if (input.location !== undefined) fieldChanges.location = input.location;
  if (input.eventDate !== undefined) fieldChanges.eventDate = new Date(input.eventDate);
  if (input.peopleInvolved !== undefined) fieldChanges.peopleInvolved = input.peopleInvolved;
  if (input.injuryOccurred !== undefined) fieldChanges.injuryOccurred = input.injuryOccurred;
  if (input.injurySeverity !== undefined) fieldChanges.injurySeverity = input.injurySeverity;
  if (input.immediateActionTaken !== undefined) fieldChanges.immediateActionTaken = input.immediateActionTaken;
  if (input.actualSeverity !== undefined) fieldChanges.actualSeverity = input.actualSeverity;
  if (input.potentialSeverity !== undefined) fieldChanges.potentialSeverity = input.potentialSeverity;
  if (input.investigationSummary !== undefined) fieldChanges.investigationSummary = input.investigationSummary;
  if (input.rootCause !== undefined) fieldChanges.rootCause = input.rootCause;
  if (input.contributingFactors !== undefined) fieldChanges.contributingFactors = input.contributingFactors;
  if (input.lessonsLearned !== undefined) fieldChanges.lessonsLearned = input.lessonsLearned;
  if (input.hazardId !== undefined) {
    fieldChanges.hazardId = input.hazardId;
    fieldChanges.hazardReferenceNumber = hazardReferenceNumber;
  }

  const investigatorChanged = input.leadInvestigator !== undefined && input.leadInvestigator !== existing.leadInvestigator;
  if (investigatorChanged) fieldChanges.leadInvestigator = input.leadInvestigator;

  await prisma.incident.update({
    where: { id },
    // `updatedAt` is `@updatedAt` on this model (unlike Hazard/CorrectiveAction, which
    // manage it manually) — Prisma bumps it automatically on this call, no explicit value needed.
    data: { ...fieldChanges, status: nextStatus ?? existing.status },
  });

  if (nextStatus && nextStatus !== existing.status) {
    await prisma.incidentActivityEntry.create({
      data: { incidentId: id, type: 'status_change', message: `Status changed from ${existing.status} to ${nextStatus}.`, actor, createdAt: now },
    });
  }

  if (investigatorChanged) {
    await prisma.incidentActivityEntry.create({
      data: {
        incidentId: id,
        type: 'investigator_assigned',
        message: input.leadInvestigator
          ? `${input.leadInvestigator} assigned as lead investigator.`
          : 'Lead investigator unassigned.',
        actor,
        createdAt: now,
      },
    });
  }

  const otherChangedFields = Object.keys(fieldChanges).filter((f) => f !== 'leadInvestigator');
  if (otherChangedFields.length > 0) {
    await prisma.incidentActivityEntry.create({
      data: { incidentId: id, type: 'updated', message: `Incident updated (${otherChangedFields.join(', ')}).`, actor, createdAt: now },
    });
  }

  const updated = await getIncidentDetail(id);
  return { ok: true, incident: updated! };
}

// Caller (controller) has already fetched and 404-checked the record.
export async function addComment(id: string, input: CreateIncidentCommentInput): Promise<IncidentComment> {
  const now = new Date();
  const row = await prisma.incidentComment.create({ data: { incidentId: id, author: input.author, message: input.message, createdAt: now } });

  await prisma.incidentActivityEntry.create({
    data: { incidentId: id, type: 'comment', message: `${input.author} added a comment.`, actor: input.author, createdAt: now },
  });

  return commentFromRow(row);
}

// Caller (controller) has already fetched and 404-checked the record.
export async function addEvidence(id: string, files: EvidenceInput[], uploadedBy: string): Promise<IncidentEvidenceItem[]> {
  const now = new Date();
  const created = await prisma.$transaction(
    files.map((file) =>
      prisma.incidentEvidenceItem.create({
        data: {
          incidentId: id,
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

  // Empty data still bumps `updatedAt` since it's `@updatedAt` on this model.
  await prisma.incident.update({ where: { id }, data: {} });

  await prisma.incidentActivityEntry.create({
    data: {
      incidentId: id,
      type: 'evidence_added',
      message: `${uploadedBy} attached ${created.length === 1 ? '1 file' : `${created.length} files`}.`,
      actor: uploadedBy,
      createdAt: now,
    },
  });

  return created.map(evidenceFromRow);
}

// Called by correctiveActions/controller.ts when a corrective action is created with
// incidentId set, so the incident's own activity trail shows the link (matching the
// existing best-effort "created corrective action ${ref}" comment pattern used by
// Hazard/Finding/Inspection/RiskAssessment via addComment elsewhere).
export async function recordCorrectiveActionCreated(incidentId: string, referenceNumber: string, actor: string): Promise<void> {
  await prisma.incidentActivityEntry.create({
    data: {
      incidentId,
      type: 'corrective_action_created',
      message: `Corrective action ${referenceNumber} created.`,
      actor,
      createdAt: new Date(),
    },
  });
}

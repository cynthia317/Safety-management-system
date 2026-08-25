import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import type {
  Finding as PrismaFinding,
  FindingActivityEntry as PrismaFindingActivityEntry,
  FindingComment as PrismaFindingComment,
} from '@prisma/client';
import type {
  CreateFindingCommentInput,
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
  workplace?: { equals: string; mode: 'insensitive' };
}

export async function listFindings(filter: ListFindingsFilter = {}): Promise<Finding[]> {
  const rows = await prisma.finding.findMany({
    where: {
      ...(filter.hazardId ? { hazardId: filter.hazardId } : {}),
      ...(filter.workplace ? { workplace: filter.workplace } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(fromRow);
}

export async function getFindingDetail(id: string): Promise<FindingDetail | undefined> {
  const row = await prisma.finding.findUnique({
    where: { id },
    include: { activity: { orderBy: { createdAt: 'asc' } }, comments: { orderBy: { createdAt: 'asc' } } },
  });
  if (!row) return undefined;

  return { ...fromRow(row), activity: row.activity.map(activityFromRow), comments: row.comments.map(commentFromRow) };
}

export async function createFinding(input: CreateFindingInput): Promise<Finding> {
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

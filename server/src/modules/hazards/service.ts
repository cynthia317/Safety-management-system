import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import type {
  HazardActivityEntry as PrismaHazardActivityEntry,
  HazardComment as PrismaHazardComment,
  HazardEvidenceItem as PrismaHazardEvidenceItem,
  HazardReport as PrismaHazardReport,
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

export async function listHazards(): Promise<HazardReport[]> {
  const rows = await prisma.hazardReport.findMany({ orderBy: { reportedAt: 'desc' } });
  return rows.map(fromRow);
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

export async function updateHazard(id: string, input: UpdateHazardInput): Promise<HazardDetail | undefined> {
  const existing = await prisma.hazardReport.findUnique({ where: { id } });
  if (!existing) return undefined;

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

export async function addComment(id: string, input: CreateCommentInput): Promise<HazardComment | undefined> {
  const existing = await prisma.hazardReport.findUnique({ where: { id } });
  if (!existing) return undefined;

  const now = new Date();
  const row = await prisma.hazardComment.create({ data: { hazardId: id, author: input.author, message: input.message, createdAt: now } });

  await prisma.hazardActivityEntry.create({
    data: { hazardId: id, type: 'comment', message: `${input.author} added a comment.`, actor: input.author, createdAt: now },
  });

  return commentFromRow(row);
}

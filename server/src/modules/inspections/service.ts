import { prisma } from '../../lib/prisma';
import { nextCounterValue } from '../../lib/counters';
import { decodeStringArray, encodeStringArray } from '../../lib/stringArray';
import * as templateService from '../inspectionTemplates/service';
import type {
  Inspection as PrismaInspection,
  InspectionActivityEntry as PrismaInspectionActivityEntry,
  QuestionResponse as PrismaQuestionResponse,
} from '@prisma/client';
import type {
  CreateInspectionInput,
  Inspection,
  InspectionActivityEntry,
  InspectionActivityType,
  InspectionStatus,
  InspectionDetail,
  PotentialFinding,
  QuestionResponse,
  SaveResponsesInput,
  UpdateInspectionInput,
} from './types';
import type { InspectionTemplate } from '../inspectionTemplates/types';

async function nextReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const value = await nextCounterValue('inspection', 41);
  return `INS-${year}-${String(value).padStart(4, '0')}`;
}

function fromRow(row: PrismaInspection): Inspection {
  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    title: row.title,
    status: row.status as InspectionStatus,
    templateId: row.templateId,
    templateName: row.templateName,
    templateVersion: row.templateVersion,
    templateSnapshot: row.templateSnapshot as unknown as InspectionTemplate,
    organisation: row.organisation,
    workplace: row.workplace,
    area: row.area,
    specificLocation: row.specificLocation,
    inspectionDate: row.inspectionDate.toISOString(),
    leadInspector: row.leadInspector,
    additionalInspectors: decodeStringArray(row.additionalInspectors),
    purpose: row.purpose,
    scope: row.scope,
    responses: [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
  };
}

function responseFromRow(row: PrismaQuestionResponse): QuestionResponse {
  return {
    questionId: row.questionId,
    sectionId: row.sectionId,
    responseType: row.responseType as QuestionResponse['responseType'],
    value: row.value,
    notes: row.notes,
    evidenceNote: row.evidenceNote,
    potentialFinding: row.potentialFinding as unknown as PotentialFinding | null,
    answeredAt: row.answeredAt.toISOString(),
  };
}

function activityFromRow(row: PrismaInspectionActivityEntry): InspectionActivityEntry {
  return {
    id: row.id,
    inspectionId: row.inspectionId,
    type: row.type as InspectionActivityType,
    message: row.message,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface RequiredQuestionSummary {
  questionId: string;
  sectionTitle: string;
  text: string;
}

export function getMissingRequiredQuestions(inspection: Inspection): RequiredQuestionSummary[] {
  const missing: RequiredQuestionSummary[] = [];

  for (const section of inspection.templateSnapshot.sections) {
    for (const question of section.questions) {
      if (!question.required) continue;
      const response = inspection.responses.find((r) => r.questionId === question.id);
      if (!response || response.value.trim().length === 0) {
        missing.push({ questionId: question.id, sectionTitle: section.title, text: question.text });
      }
    }
  }

  return missing;
}

async function toDetail(row: PrismaInspection): Promise<InspectionDetail> {
  const [responses, activity] = await Promise.all([
    prisma.questionResponse.findMany({ where: { inspectionId: row.id } }),
    prisma.inspectionActivityEntry.findMany({ where: { inspectionId: row.id }, orderBy: { createdAt: 'asc' } }),
  ]);

  return {
    ...fromRow(row),
    responses: responses.map(responseFromRow),
    activity: activity.map(activityFromRow),
  };
}

export async function listInspections(): Promise<Inspection[]> {
  const rows = await prisma.inspection.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(fromRow);
}

export async function getInspectionDetail(id: string): Promise<InspectionDetail | undefined> {
  const row = await prisma.inspection.findUnique({ where: { id } });
  if (!row) return undefined;
  return toDetail(row);
}

export async function createInspection(input: CreateInspectionInput, actor: string): Promise<Inspection | { error: string }> {
  const template = await templateService.getTemplate(input.templateId);
  if (!template) return { error: 'Selected inspection template was not found.' };
  if (template.status !== 'Active') return { error: 'Only active templates can be used to start an inspection.' };

  const now = new Date();

  const row = await prisma.inspection.create({
    data: {
      referenceNumber: await nextReferenceNumber(),
      title: input.title,
      status: 'Draft',
      templateId: template.id,
      templateName: template.name,
      templateVersion: template.version,
      templateSnapshot: template as object,
      organisation: input.organisation,
      workplace: input.workplace,
      area: input.area,
      specificLocation: input.specificLocation,
      inspectionDate: new Date(input.inspectionDate),
      leadInspector: input.leadInspector,
      additionalInspectors: encodeStringArray(input.additionalInspectors),
      purpose: input.purpose,
      scope: input.scope,
      createdAt: now,
      updatedAt: now,
      activity: { create: { type: 'created', message: 'Inspection created.', actor, createdAt: now } },
    },
  });

  return fromRow(row);
}

export async function updateInspection(id: string, input: UpdateInspectionInput): Promise<InspectionDetail | undefined> {
  const existing = await prisma.inspection.findUnique({ where: { id } });
  if (!existing) return undefined;

  const now = new Date();
  const actor = input.actor && input.actor.length > 0 ? input.actor : 'Safety Officer';
  const nextStatus = input.status;

  const fieldChanges: Record<string, unknown> = {};
  if (input.title !== undefined) fieldChanges.title = input.title;
  if (input.organisation !== undefined) fieldChanges.organisation = input.organisation;
  if (input.workplace !== undefined) fieldChanges.workplace = input.workplace;
  if (input.area !== undefined) fieldChanges.area = input.area;
  if (input.specificLocation !== undefined) fieldChanges.specificLocation = input.specificLocation;
  if (input.inspectionDate !== undefined) fieldChanges.inspectionDate = new Date(input.inspectionDate);
  if (input.leadInspector !== undefined) fieldChanges.leadInspector = input.leadInspector;
  if (input.additionalInspectors !== undefined) fieldChanges.additionalInspectors = encodeStringArray(input.additionalInspectors);
  if (input.purpose !== undefined) fieldChanges.purpose = input.purpose;
  if (input.scope !== undefined) fieldChanges.scope = input.scope;

  const row = await prisma.inspection.update({
    where: { id },
    data: {
      ...fieldChanges,
      status: nextStatus ?? existing.status,
      reviewedAt: nextStatus === 'Reviewed' ? now : existing.reviewedAt,
      updatedAt: now,
    },
  });

  if (nextStatus && nextStatus !== existing.status) {
    await prisma.inspectionActivityEntry.create({
      data: { inspectionId: id, type: 'status_change', message: `Status changed from ${existing.status} to ${nextStatus}.`, actor, createdAt: now },
    });
  }

  const changedFieldNames = Object.keys(fieldChanges);
  if (changedFieldNames.length > 0) {
    await prisma.inspectionActivityEntry.create({
      data: { inspectionId: id, type: 'updated', message: `Inspection details updated (${changedFieldNames.join(', ')}).`, actor, createdAt: now },
    });
  }

  return toDetail(row);
}

export async function saveResponses(id: string, input: SaveResponsesInput): Promise<InspectionDetail | undefined> {
  const existing = await prisma.inspection.findUnique({ where: { id } });
  if (!existing) return undefined;

  const now = new Date();
  let nonComplianceCount = 0;

  for (const responseInput of input.responses) {
    await prisma.questionResponse.upsert({
      where: { inspectionId_questionId: { inspectionId: id, questionId: responseInput.questionId } },
      create: {
        inspectionId: id,
        questionId: responseInput.questionId,
        sectionId: responseInput.sectionId,
        responseType: responseInput.responseType,
        value: responseInput.value,
        notes: responseInput.notes,
        evidenceNote: responseInput.evidenceNote,
        potentialFinding: responseInput.potentialFinding as object | undefined,
        answeredAt: now,
      },
      update: {
        sectionId: responseInput.sectionId,
        responseType: responseInput.responseType,
        value: responseInput.value,
        notes: responseInput.notes,
        evidenceNote: responseInput.evidenceNote,
        potentialFinding: responseInput.potentialFinding as object | undefined,
        answeredAt: now,
      },
    });
    if (responseInput.value === 'Non-Compliant') nonComplianceCount += 1;
  }

  const wasUnstarted = existing.status === 'Draft';

  const row = await prisma.inspection.update({
    where: { id },
    data: { status: existing.status === 'Draft' ? 'In Progress' : existing.status, updatedAt: now },
  });

  if (wasUnstarted) {
    await prisma.inspectionActivityEntry.create({
      data: { inspectionId: id, type: 'started', message: 'Inspection started.', actor: input.actor, createdAt: now },
    });
  }

  await prisma.inspectionActivityEntry.create({
    data: {
      inspectionId: id,
      type: 'response_saved',
      message: `Saved ${input.responses.length} response${input.responses.length === 1 ? '' : 's'}.`,
      actor: input.actor,
      createdAt: now,
    },
  });

  if (nonComplianceCount > 0) {
    await prisma.inspectionActivityEntry.create({
      data: {
        inspectionId: id,
        type: 'non_compliance_recorded',
        message: `Recorded ${nonComplianceCount} non-compliant response${nonComplianceCount === 1 ? '' : 's'}.`,
        actor: input.actor,
        createdAt: now,
      },
    });
  }

  return toDetail(row);
}

export type SubmitResult =
  | { ok: true; inspection: InspectionDetail }
  | { ok: false; missing: RequiredQuestionSummary[] };

export async function submitInspection(id: string, actor: string): Promise<SubmitResult | undefined> {
  const existing = await getInspectionDetail(id);
  if (!existing) return undefined;

  const missing = getMissingRequiredQuestions(existing);
  if (missing.length > 0) {
    return { ok: false, missing };
  }

  const now = new Date();
  const row = await prisma.inspection.update({
    where: { id },
    data: { status: 'Submitted', submittedAt: now, updatedAt: now },
  });

  await prisma.inspectionActivityEntry.create({
    data: { inspectionId: id, type: 'submitted', message: 'Inspection submitted.', actor, createdAt: now },
  });

  return { ok: true, inspection: await toDetail(row) };
}

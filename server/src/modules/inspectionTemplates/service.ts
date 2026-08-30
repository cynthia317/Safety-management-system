import { prisma } from '../../lib/prisma';
import type {
  InspectionTemplate as PrismaInspectionTemplate,
  TemplateSection as PrismaTemplateSection,
  TemplateQuestion as PrismaTemplateQuestion,
  InspectionTemplateActivityEntry as PrismaInspectionTemplateActivityEntry,
} from '@prisma/client';
import type {
  CreateTemplateInput,
  InspectionTemplate,
  InspectionTemplateActivityEntry,
  InspectionTemplateActivityType,
  InspectionTemplateDetail,
  QuestionInput,
  QuestionResponseType,
  SectionInput,
  TemplateCategory,
  TemplateQuestion,
  TemplateSection,
  TemplateStatus,
  UpdateTemplateInput,
} from './types';

type TemplateRow = PrismaInspectionTemplate & { sections: (PrismaTemplateSection & { questions: PrismaTemplateQuestion[] })[] };

const WITH_SECTIONS = {
  orderBy: { order: 'asc' as const },
  include: { questions: { orderBy: { order: 'asc' as const } } },
};

function fromRow(row: TemplateRow): InspectionTemplate {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    category: row.category as TemplateCategory,
    applicableIndustries: row.applicableIndustries,
    version: row.version,
    status: row.status as TemplateStatus,
    sections: row.sections.map(
      (section): TemplateSection => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
        questions: section.questions.map(
          (q): TemplateQuestion => ({
            id: q.id,
            text: q.text,
            guidance: q.guidance,
            referenceNote: q.referenceNote,
            responseType: q.responseType as QuestionResponseType,
            options: q.options,
            required: q.required,
            evidenceRequired: q.evidenceRequired,
            allowFindingCreation: q.allowFindingCreation,
            order: q.order,
          }),
        ),
      }),
    ),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function activityFromRow(row: PrismaInspectionTemplateActivityEntry): InspectionTemplateActivityEntry {
  return {
    id: row.id,
    inspectionTemplateId: row.inspectionTemplateId,
    type: row.type as InspectionTemplateActivityType,
    message: row.message,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listTemplates(): Promise<InspectionTemplate[]> {
  const rows = await prisma.inspectionTemplate.findMany({
    orderBy: { name: 'asc' },
    include: { sections: WITH_SECTIONS },
  });
  return rows.map(fromRow);
}

export async function getTemplate(id: string): Promise<InspectionTemplateDetail | undefined> {
  const row = await prisma.inspectionTemplate.findUnique({
    where: { id },
    include: { sections: WITH_SECTIONS, activity: { orderBy: { createdAt: 'asc' } } },
  });
  if (!row) return undefined;
  return { ...fromRow(row), activity: row.activity.map(activityFromRow) };
}

function sectionCreateData(inputs: SectionInput[]) {
  return inputs.map((section, index) => ({
    title: section.title,
    description: section.description,
    order: section.order ?? index,
    questions: {
      create: section.questions.map((q: QuestionInput, qIndex) => ({
        text: q.text,
        guidance: q.guidance,
        referenceNote: q.referenceNote,
        responseType: q.responseType,
        options: q.options,
        required: q.required,
        evidenceRequired: q.evidenceRequired,
        allowFindingCreation: q.allowFindingCreation,
        order: q.order ?? qIndex,
      })),
    },
  }));
}

export async function createTemplate(input: CreateTemplateInput, actor: string): Promise<InspectionTemplateDetail> {
  const now = new Date();
  const row = await prisma.inspectionTemplate.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
      category: input.category,
      applicableIndustries: input.applicableIndustries,
      version: 1,
      status: 'Draft',
      sections: { create: sectionCreateData(input.sections) },
      activity: { create: { type: 'created', message: 'Inspection template created.', actor, createdAt: now } },
    },
    include: { sections: WITH_SECTIONS, activity: { orderBy: { createdAt: 'asc' } } },
  });
  return { ...fromRow(row), activity: row.activity.map(activityFromRow) };
}

/** Replaces the whole section/question tree — the builder UI freely adds, removes, and
 * reorders both levels in one save, so a targeted diff isn't worth the complexity. */
async function replaceSections(templateId: string, sections: SectionInput[]): Promise<void> {
  await prisma.templateSection.deleteMany({ where: { templateId } });
  for (const [index, section] of sections.entries()) {
    await prisma.templateSection.create({
      data: {
        templateId,
        title: section.title,
        description: section.description,
        order: section.order ?? index,
        questions: {
          create: section.questions.map((q, qIndex) => ({
            text: q.text,
            guidance: q.guidance,
            referenceNote: q.referenceNote,
            responseType: q.responseType,
            options: q.options,
            required: q.required,
            evidenceRequired: q.evidenceRequired,
            allowFindingCreation: q.allowFindingCreation,
            order: q.order ?? qIndex,
          })),
        },
      },
    });
  }
}

export async function updateTemplate(
  id: string,
  input: UpdateTemplateInput,
  actor: string,
): Promise<InspectionTemplateDetail | undefined> {
  const existing = await prisma.inspectionTemplate.findUnique({ where: { id } });
  if (!existing) return undefined;

  const now = new Date();
  const nextStatus = input.status;

  if (input.sections) {
    await replaceSections(id, input.sections);
  }

  await prisma.inspectionTemplate.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      code: input.code ?? existing.code,
      description: input.description ?? existing.description,
      category: input.category ?? existing.category,
      applicableIndustries: input.applicableIndustries ?? existing.applicableIndustries,
      status: nextStatus ?? existing.status,
      version: { increment: 1 },
    },
  });

  if (nextStatus && nextStatus !== existing.status) {
    await prisma.inspectionTemplateActivityEntry.create({
      data: {
        inspectionTemplateId: id,
        type: 'status_change',
        message: `Status changed from ${existing.status} to ${nextStatus}.`,
        actor,
        createdAt: now,
      },
    });
  }

  const changedFieldNames = (['name', 'code', 'description', 'category', 'applicableIndustries', 'sections'] as const).filter(
    (key) => input[key] !== undefined,
  );
  if (changedFieldNames.length > 0) {
    await prisma.inspectionTemplateActivityEntry.create({
      data: {
        inspectionTemplateId: id,
        type: 'updated',
        message: `Template updated to v${existing.version + 1} (${changedFieldNames.join(', ')}).`,
        actor,
        createdAt: now,
      },
    });
  }

  return getTemplate(id);
}

export async function duplicateTemplate(id: string, actor: string): Promise<InspectionTemplateDetail | undefined> {
  const existing = await getTemplate(id);
  if (!existing) return undefined;

  const now = new Date();
  const row = await prisma.inspectionTemplate.create({
    data: {
      name: `${existing.name} (Copy)`,
      code: `${existing.code}-COPY`,
      description: existing.description,
      category: existing.category,
      applicableIndustries: existing.applicableIndustries,
      status: 'Draft',
      version: 1,
      sections: { create: sectionCreateData(existing.sections) },
      activity: {
        create: {
          type: 'created',
          message: `Duplicated from "${existing.name}" (v${existing.version}).`,
          actor,
          createdAt: now,
        },
      },
    },
    include: { sections: WITH_SECTIONS, activity: { orderBy: { createdAt: 'asc' } } },
  });
  return { ...fromRow(row), activity: row.activity.map(activityFromRow) };
}

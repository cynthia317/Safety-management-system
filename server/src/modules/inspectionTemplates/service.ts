import { prisma } from '../../lib/prisma';
import { decodeStringArray, encodeStringArray } from '../../lib/stringArray';
import type {
  InspectionTemplate as PrismaInspectionTemplate,
  TemplateSection as PrismaTemplateSection,
  TemplateQuestion as PrismaTemplateQuestion,
} from '@prisma/client';
import type {
  CreateTemplateInput,
  InspectionTemplate,
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
    applicableIndustries: decodeStringArray(row.applicableIndustries),
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
            options: decodeStringArray(q.options),
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

export async function listTemplates(): Promise<InspectionTemplate[]> {
  const rows = await prisma.inspectionTemplate.findMany({
    orderBy: { name: 'asc' },
    include: { sections: WITH_SECTIONS },
  });
  return rows.map(fromRow);
}

export async function getTemplate(id: string): Promise<InspectionTemplate | undefined> {
  const row = await prisma.inspectionTemplate.findUnique({ where: { id }, include: { sections: WITH_SECTIONS } });
  return row ? fromRow(row) : undefined;
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
        options: encodeStringArray(q.options),
        required: q.required,
        evidenceRequired: q.evidenceRequired,
        allowFindingCreation: q.allowFindingCreation,
        order: q.order ?? qIndex,
      })),
    },
  }));
}

export async function createTemplate(input: CreateTemplateInput): Promise<InspectionTemplate> {
  const row = await prisma.inspectionTemplate.create({
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
      category: input.category,
      applicableIndustries: encodeStringArray(input.applicableIndustries),
      version: 1,
      status: 'Draft',
      sections: { create: sectionCreateData(input.sections) },
    },
    include: { sections: WITH_SECTIONS },
  });
  return fromRow(row);
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
            options: encodeStringArray(q.options),
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

export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<InspectionTemplate | undefined> {
  const existing = await prisma.inspectionTemplate.findUnique({ where: { id } });
  if (!existing) return undefined;

  if (input.sections) {
    await replaceSections(id, input.sections);
  }

  const row = await prisma.inspectionTemplate.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      code: input.code ?? existing.code,
      description: input.description ?? existing.description,
      category: input.category ?? existing.category,
      applicableIndustries: input.applicableIndustries ? encodeStringArray(input.applicableIndustries) : existing.applicableIndustries,
      status: input.status ?? existing.status,
      version: { increment: 1 },
    },
    include: { sections: WITH_SECTIONS },
  });
  return fromRow(row);
}

export async function duplicateTemplate(id: string): Promise<InspectionTemplate | undefined> {
  const existing = await getTemplate(id);
  if (!existing) return undefined;

  const row = await prisma.inspectionTemplate.create({
    data: {
      name: `${existing.name} (Copy)`,
      code: `${existing.code}-COPY`,
      description: existing.description,
      category: existing.category,
      applicableIndustries: encodeStringArray(existing.applicableIndustries),
      status: 'Draft',
      version: 1,
      sections: { create: sectionCreateData(existing.sections) },
    },
    include: { sections: WITH_SECTIONS },
  });
  return fromRow(row);
}

import type {
  CreateTemplateInput,
  QuestionInput,
  QuestionResponseType,
  SectionInput,
  TemplateCategory,
  TemplateStatus,
  UpdateTemplateInput,
} from './types';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'General Workplace Safety',
  'Fire Safety',
  'Electrical Safety',
  'Housekeeping',
  'Machinery Safety',
  'PPE',
  'Ergonomics',
  'Chemical Safety',
  'Emergency Preparedness',
  'Environmental Health and Safety',
  'Construction Safety',
  'Office Safety',
  'Healthcare Safety',
  'Laboratory Safety',
  'School Safety',
  'Retail Safety',
  'Hospitality Safety',
  'Vehicle and Transport Safety',
  'Contractor Safety',
  'Custom Inspection',
];

export const TEMPLATE_STATUSES: TemplateStatus[] = ['Draft', 'Active', 'Archived'];

export const RESPONSE_TYPES: QuestionResponseType[] = [
  'compliance',
  'yes_no',
  'text',
  'number',
  'date',
  'multiple_choice',
  'rating',
  'risk_rating',
];

export type ValidationErrors = Record<string, string>;

export interface ValidationResult<T> {
  errors: ValidationErrors | null;
  value: T;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
}

function sanitizeQuestion(raw: unknown, index: number): QuestionInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const q = raw as Record<string, unknown>;

  if (!isNonEmptyString(q.text)) return null;
  const responseType = RESPONSE_TYPES.includes(q.responseType as QuestionResponseType)
    ? (q.responseType as QuestionResponseType)
    : 'compliance';

  return {
    id: isNonEmptyString(q.id) ? q.id : undefined,
    text: q.text.trim(),
    guidance: isNonEmptyString(q.guidance) ? q.guidance.trim() : '',
    referenceNote: isNonEmptyString(q.referenceNote) ? q.referenceNote.trim() : '',
    responseType,
    options: responseType === 'multiple_choice' ? sanitizeStringArray(q.options) : [],
    required: q.required !== false,
    evidenceRequired: q.evidenceRequired === true,
    allowFindingCreation: q.allowFindingCreation !== false,
    order: typeof q.order === 'number' ? q.order : index,
  };
}

function sanitizeSection(raw: unknown, index: number): SectionInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;

  if (!isNonEmptyString(s.title)) return null;

  const questions = Array.isArray(s.questions)
    ? s.questions
        .map((q, i) => sanitizeQuestion(q, i))
        .filter((q): q is QuestionInput => q !== null)
    : [];

  return {
    id: isNonEmptyString(s.id) ? s.id : undefined,
    title: s.title.trim(),
    description: isNonEmptyString(s.description) ? s.description.trim() : '',
    order: typeof s.order === 'number' ? s.order : index,
    questions,
  };
}

function sanitizeSections(value: unknown): SectionInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((s, i) => sanitizeSection(s, i)).filter((s): s is SectionInput => s !== null);
}

export function validateCreateTemplate(body: unknown): ValidationResult<CreateTemplateInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.name)) errors.name = 'Template name is required.';
  if (!isNonEmptyString(b.code)) errors.code = 'Template code is required.';
  if (!isNonEmptyString(b.category) || !TEMPLATE_CATEGORIES.includes(b.category as TemplateCategory)) {
    errors.category = 'Select a valid category.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateTemplateInput };
  }

  return {
    errors: null,
    value: {
      name: (b.name as string).trim(),
      code: (b.code as string).trim().toUpperCase(),
      description: isNonEmptyString(b.description) ? b.description.trim() : '',
      category: b.category as TemplateCategory,
      applicableIndustries: sanitizeStringArray(b.applicableIndustries),
      sections: sanitizeSections(b.sections),
    },
  };
}

export function validateUpdateTemplate(body: unknown): ValidationResult<UpdateTemplateInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateTemplateInput = {};

  if (b.name !== undefined) {
    if (!isNonEmptyString(b.name)) errors.name = 'Template name cannot be empty.';
    else value.name = b.name.trim();
  }

  if (b.code !== undefined) {
    if (!isNonEmptyString(b.code)) errors.code = 'Template code cannot be empty.';
    else value.code = b.code.trim().toUpperCase();
  }

  if (b.description !== undefined) {
    value.description = isNonEmptyString(b.description) ? b.description.trim() : '';
  }

  if (b.category !== undefined) {
    if (!isNonEmptyString(b.category) || !TEMPLATE_CATEGORIES.includes(b.category as TemplateCategory)) {
      errors.category = 'Select a valid category.';
    } else {
      value.category = b.category as TemplateCategory;
    }
  }

  if (b.applicableIndustries !== undefined) {
    value.applicableIndustries = sanitizeStringArray(b.applicableIndustries);
  }

  if (b.status !== undefined) {
    if (!isNonEmptyString(b.status) || !TEMPLATE_STATUSES.includes(b.status as TemplateStatus)) {
      errors.status = 'Select a valid status.';
    } else {
      value.status = b.status as TemplateStatus;
    }
  }

  if (b.sections !== undefined) {
    value.sections = sanitizeSections(b.sections);
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateTemplateInput };
  }

  return { errors: null, value };
}

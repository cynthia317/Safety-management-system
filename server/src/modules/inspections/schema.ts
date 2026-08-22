import type {
  CreateInspectionInput,
  PotentialFinding,
  PotentialFindingStatus,
  ResponseInput,
  RiskLevel,
  SaveResponsesInput,
  UpdateInspectionInput,
} from './types';
import type { InspectionStatus } from './types';

export const INSPECTION_STATUSES: InspectionStatus[] = ['Draft', 'In Progress', 'Submitted', 'Reviewed', 'Closed'];
export const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];
const FINDING_STATUSES: PotentialFindingStatus[] = ['Potential', 'Dismissed', 'Created'];

export type ValidationErrors = Record<string, string>;

export interface ValidationResult<T> {
  errors: ValidationErrors | null;
  value: T;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(new Date(value).getTime());
}

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim());
}

export function validateCreateInspection(body: unknown): ValidationResult<CreateInspectionInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.templateId)) errors.templateId = 'Select an inspection template.';
  if (!isNonEmptyString(b.title)) errors.title = 'Inspection title is required.';
  if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace is required.';
  if (!isNonEmptyString(b.area)) errors.area = 'Area / department is required.';
  if (!isValidDate(b.inspectionDate)) errors.inspectionDate = 'Select a valid inspection date.';
  if (!isNonEmptyString(b.leadInspector)) errors.leadInspector = 'Lead inspector is required.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateInspectionInput };
  }

  return {
    errors: null,
    value: {
      templateId: (b.templateId as string).trim(),
      title: (b.title as string).trim(),
      organisation: isNonEmptyString(b.organisation) ? b.organisation.trim() : '',
      workplace: (b.workplace as string).trim(),
      area: (b.area as string).trim(),
      specificLocation: isNonEmptyString(b.specificLocation) ? b.specificLocation.trim() : '',
      inspectionDate: new Date(b.inspectionDate as string).toISOString(),
      leadInspector: (b.leadInspector as string).trim(),
      additionalInspectors: sanitizeStringArray(b.additionalInspectors),
      purpose: isNonEmptyString(b.purpose) ? b.purpose.trim() : '',
      scope: isNonEmptyString(b.scope) ? b.scope.trim() : '',
    },
  };
}

export function validateUpdateInspection(body: unknown): ValidationResult<UpdateInspectionInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateInspectionInput = {};

  if (b.title !== undefined) {
    if (!isNonEmptyString(b.title)) errors.title = 'Inspection title cannot be empty.';
    else value.title = b.title.trim();
  }
  if (b.organisation !== undefined) value.organisation = isNonEmptyString(b.organisation) ? b.organisation.trim() : '';
  if (b.workplace !== undefined) {
    if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace is required.';
    else value.workplace = b.workplace.trim();
  }
  if (b.area !== undefined) {
    if (!isNonEmptyString(b.area)) errors.area = 'Area / department is required.';
    else value.area = b.area.trim();
  }
  if (b.specificLocation !== undefined) {
    value.specificLocation = isNonEmptyString(b.specificLocation) ? b.specificLocation.trim() : '';
  }
  if (b.inspectionDate !== undefined) {
    if (!isValidDate(b.inspectionDate)) errors.inspectionDate = 'Select a valid inspection date.';
    else value.inspectionDate = new Date(b.inspectionDate as string).toISOString();
  }
  if (b.leadInspector !== undefined) {
    if (!isNonEmptyString(b.leadInspector)) errors.leadInspector = 'Lead inspector is required.';
    else value.leadInspector = b.leadInspector.trim();
  }
  if (b.additionalInspectors !== undefined) value.additionalInspectors = sanitizeStringArray(b.additionalInspectors);
  if (b.purpose !== undefined) value.purpose = isNonEmptyString(b.purpose) ? b.purpose.trim() : '';
  if (b.scope !== undefined) value.scope = isNonEmptyString(b.scope) ? b.scope.trim() : '';

  if (b.status !== undefined) {
    if (!isNonEmptyString(b.status) || !['Draft', 'In Progress', 'Submitted', 'Reviewed', 'Closed'].includes(b.status)) {
      errors.status = 'Select a valid status.';
    } else {
      value.status = b.status as UpdateInspectionInput['status'];
    }
  }

  if (isNonEmptyString(b.actor)) value.actor = b.actor.trim();

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateInspectionInput };
  }

  return { errors: null, value };
}

function sanitizePotentialFinding(raw: unknown): PotentialFinding | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const f = raw as Record<string, unknown>;

  if (!isNonEmptyString(f.title)) return null;

  return {
    id: isNonEmptyString(f.id) ? f.id : `pf-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: f.title.trim(),
    description: isNonEmptyString(f.description) ? f.description.trim() : '',
    riskLevel: RISK_LEVELS.includes(f.riskLevel as RiskLevel) ? (f.riskLevel as RiskLevel) : 'Medium',
    recommendation: isNonEmptyString(f.recommendation) ? f.recommendation.trim() : '',
    immediateAction: isNonEmptyString(f.immediateAction) ? f.immediateAction.trim() : '',
    status: FINDING_STATUSES.includes(f.status as PotentialFindingStatus)
      ? (f.status as PotentialFindingStatus)
      : 'Potential',
  };
}

function sanitizeResponse(raw: unknown): ResponseInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;

  if (!isNonEmptyString(r.questionId) || !isNonEmptyString(r.sectionId)) return null;

  return {
    questionId: r.questionId.trim(),
    sectionId: r.sectionId.trim(),
    responseType: isNonEmptyString(r.responseType) ? (r.responseType as ResponseInput['responseType']) : 'compliance',
    value: typeof r.value === 'string' ? r.value : '',
    notes: isNonEmptyString(r.notes) ? r.notes.trim() : '',
    evidenceNote: isNonEmptyString(r.evidenceNote) ? r.evidenceNote.trim() : '',
    potentialFinding: sanitizePotentialFinding(r.potentialFinding),
  };
}

export function validateSaveResponses(body: unknown): ValidationResult<SaveResponsesInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!Array.isArray(b.responses) || b.responses.length === 0) {
    errors.responses = 'At least one response is required.';
    return { errors, value: undefined as unknown as SaveResponsesInput };
  }

  const responses = b.responses.map(sanitizeResponse).filter((r): r is ResponseInput => r !== null);

  if (responses.length === 0) {
    errors.responses = 'No valid responses were provided.';
    return { errors, value: undefined as unknown as SaveResponsesInput };
  }

  return {
    errors: null,
    value: {
      responses,
      actor: isNonEmptyString(b.actor) ? b.actor.trim() : 'Inspector',
    },
  };
}

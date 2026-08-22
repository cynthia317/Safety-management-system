import { isValidScale } from './riskMatrix';
import type {
  AssessmentType,
  CreateRiskAssessmentInput,
  RiskAssessmentItemInput,
  RiskAssessmentStatus,
  UpdateRiskAssessmentInput,
} from './types';

export const ASSESSMENT_TYPES: AssessmentType[] = [
  'Routine',
  'Task-Based',
  'New Process / Equipment',
  'Post-Incident',
  'Legal / Statutory',
  'Project / Construction',
];

export const RISK_ASSESSMENT_STATUSES: RiskAssessmentStatus[] = ['Draft', 'Under Review', 'Approved', 'Closed'];

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

function sanitizeScale(value: unknown): number | null {
  return isValidScale(value) ? value : null;
}

function sanitizeItem(raw: unknown, index: number): RiskAssessmentItemInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const i = raw as Record<string, unknown>;

  if (!isNonEmptyString(i.hazard)) return null;
  const likelihood = sanitizeScale(i.likelihood);
  const severity = sanitizeScale(i.severity);
  if (likelihood === null || severity === null) return null;

  return {
    id: isNonEmptyString(i.id) ? i.id : undefined,
    hazard: i.hazard.trim(),
    whoMightBeHarmed: isNonEmptyString(i.whoMightBeHarmed) ? i.whoMightBeHarmed.trim() : '',
    existingControls: isNonEmptyString(i.existingControls) ? i.existingControls.trim() : '',
    likelihood,
    severity,
    additionalControls: isNonEmptyString(i.additionalControls) ? i.additionalControls.trim() : '',
    residualLikelihood: sanitizeScale(i.residualLikelihood),
    residualSeverity: sanitizeScale(i.residualSeverity),
    order: typeof i.order === 'number' ? i.order : index,
  };
}

function sanitizeItems(value: unknown): RiskAssessmentItemInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((i, idx) => sanitizeItem(i, idx)).filter((i): i is RiskAssessmentItemInput => i !== null);
}

export function validateCreateRiskAssessment(body: unknown): ValidationResult<CreateRiskAssessmentInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.title)) errors.title = 'Title is required.';
  if (!isNonEmptyString(b.assessmentType) || !ASSESSMENT_TYPES.includes(b.assessmentType as AssessmentType)) {
    errors.assessmentType = 'Select a valid assessment type.';
  }
  if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace is required.';
  if (!isNonEmptyString(b.department)) errors.department = 'Area / department is required.';
  if (!isNonEmptyString(b.assessedBy)) errors.assessedBy = 'Assessed by is required.';
  if (!isNonEmptyString(b.assessmentDate)) errors.assessmentDate = 'Assessment date is required.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateRiskAssessmentInput };
  }

  return {
    errors: null,
    value: {
      title: (b.title as string).trim(),
      assessmentType: b.assessmentType as AssessmentType,
      description: isNonEmptyString(b.description) ? b.description.trim() : '',
      workplace: (b.workplace as string).trim(),
      department: (b.department as string).trim(),
      location: isNonEmptyString(b.location) ? b.location.trim() : '',
      assessedBy: (b.assessedBy as string).trim(),
      assessmentDate: (b.assessmentDate as string).trim(),
      nextReviewDate: isNonEmptyString(b.nextReviewDate) ? b.nextReviewDate.trim() : '',
      items: sanitizeItems(b.items),
    },
  };
}

export function validateUpdateRiskAssessment(body: unknown): ValidationResult<UpdateRiskAssessmentInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateRiskAssessmentInput = {};

  if (b.title !== undefined) {
    if (!isNonEmptyString(b.title)) errors.title = 'Title cannot be empty.';
    else value.title = b.title.trim();
  }

  if (b.assessmentType !== undefined) {
    if (!isNonEmptyString(b.assessmentType) || !ASSESSMENT_TYPES.includes(b.assessmentType as AssessmentType)) {
      errors.assessmentType = 'Select a valid assessment type.';
    } else {
      value.assessmentType = b.assessmentType as AssessmentType;
    }
  }

  if (b.description !== undefined) {
    value.description = isNonEmptyString(b.description) ? b.description.trim() : '';
  }

  if (b.workplace !== undefined) {
    if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace cannot be empty.';
    else value.workplace = b.workplace.trim();
  }

  if (b.department !== undefined) {
    if (!isNonEmptyString(b.department)) errors.department = 'Area / department cannot be empty.';
    else value.department = b.department.trim();
  }

  if (b.location !== undefined) {
    value.location = isNonEmptyString(b.location) ? b.location.trim() : '';
  }

  if (b.status !== undefined) {
    if (!isNonEmptyString(b.status) || !RISK_ASSESSMENT_STATUSES.includes(b.status as RiskAssessmentStatus)) {
      errors.status = 'Select a valid status.';
    } else {
      value.status = b.status as RiskAssessmentStatus;
    }
  }

  if (b.assessedBy !== undefined) {
    if (!isNonEmptyString(b.assessedBy)) errors.assessedBy = 'Assessed by cannot be empty.';
    else value.assessedBy = b.assessedBy.trim();
  }

  if (b.approvedBy !== undefined) {
    value.approvedBy = isNonEmptyString(b.approvedBy) ? b.approvedBy.trim() : '';
  }

  if (b.assessmentDate !== undefined) {
    if (!isNonEmptyString(b.assessmentDate)) errors.assessmentDate = 'Assessment date cannot be empty.';
    else value.assessmentDate = b.assessmentDate.trim();
  }

  if (b.nextReviewDate !== undefined) {
    value.nextReviewDate = isNonEmptyString(b.nextReviewDate) ? b.nextReviewDate.trim() : '';
  }

  if (b.items !== undefined) {
    value.items = sanitizeItems(b.items);
  }

  if (b.actor !== undefined) {
    value.actor = isNonEmptyString(b.actor) ? b.actor.trim() : undefined;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateRiskAssessmentInput };
  }

  return { errors: null, value };
}

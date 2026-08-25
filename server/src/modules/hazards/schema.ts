import type {
  CreateCommentInput,
  CreateHazardInput,
  EvidenceInput,
  HazardCategory,
  HazardStatus,
  ReportType,
  RiskLevel,
  UpdateHazardInput,
} from './types';

const MAX_EVIDENCE_ITEMS = 5;
const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;

// Hazard evidence is photos only (the upload UI only ever offers an image picker) — an
// allow-list closes off uploading an arbitrary file type (e.g. an HTML page or script)
// under a spoofed extension.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

// The client-reported `fileSize` was previously trusted as-is — a caller could declare
// any size while sending a much larger `dataUrl`. This decodes the actual base64 payload
// length instead, so the real size is what gets checked against the limit.
function decodedByteLength(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(',');
  const base64Part = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : '';
  if (base64Part.length === 0) return 0;
  const padding = base64Part.endsWith('==') ? 2 : base64Part.endsWith('=') ? 1 : 0;
  return Math.floor((base64Part.length * 3) / 4) - padding;
}

function sanitizeEvidence(input: unknown): EvidenceInput[] {
  if (!Array.isArray(input)) return [];

  const items: EvidenceInput[] = [];
  for (const raw of input) {
    if (items.length >= MAX_EVIDENCE_ITEMS) break;
    if (typeof raw !== 'object' || raw === null) continue;

    const item = raw as Record<string, unknown>;
    if (
      isNonEmptyString(item.fileName) &&
      isNonEmptyString(item.mimeType) &&
      ALLOWED_MIME_TYPES.includes(item.mimeType.trim().toLowerCase()) &&
      isNonEmptyString(item.dataUrl) &&
      item.dataUrl.startsWith('data:') &&
      typeof item.fileSize === 'number' &&
      item.fileSize > 0 &&
      item.fileSize <= MAX_EVIDENCE_BYTES &&
      decodedByteLength(item.dataUrl) <= MAX_EVIDENCE_BYTES
    ) {
      items.push({
        fileName: item.fileName.trim(),
        fileSize: item.fileSize,
        mimeType: item.mimeType.trim(),
        dataUrl: item.dataUrl,
      });
    }
  }

  return items;
}

export const REPORT_TYPES: ReportType[] = [
  'Unsafe Condition',
  'Unsafe Act',
  'Near Miss',
  'Equipment Defect',
  'Environmental Concern',
  'Positive Safety Observation',
];

export const HAZARD_CATEGORIES: HazardCategory[] = [
  'Fire Safety',
  'Mechanical',
  'Electrical',
  'Chemical',
  'Slip, Trip & Fall',
  'Ergonomic',
  'PPE',
  'Environmental',
  'Other',
];

export const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];

export const HAZARD_STATUSES: HazardStatus[] = [
  'New',
  'Under Review',
  'Action Required',
  'Resolved',
  'Closed',
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

export function validateCreateHazard(body: unknown): ValidationResult<CreateHazardInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.title)) {
    errors.title = 'Title is required.';
  } else if (b.title.trim().length > 160) {
    errors.title = 'Title must be 160 characters or fewer.';
  }

  if (!isNonEmptyString(b.description)) {
    errors.description = 'Description is required — describe what was observed.';
  }

  if (!isNonEmptyString(b.reportType) || !REPORT_TYPES.includes(b.reportType as ReportType)) {
    errors.reportType = 'Select a valid report type.';
  }

  if (
    !isNonEmptyString(b.hazardCategory) ||
    !HAZARD_CATEGORIES.includes(b.hazardCategory as HazardCategory)
  ) {
    errors.hazardCategory = 'Select a valid hazard category.';
  }

  if (!isNonEmptyString(b.workplace)) {
    errors.workplace = 'Workplace is required.';
  }

  if (!isNonEmptyString(b.department)) {
    errors.department = 'Department is required.';
  }

  if (!isNonEmptyString(b.location)) {
    errors.location = 'Specific location is required.';
  }

  if (!isNonEmptyString(b.peopleAtRisk)) {
    errors.peopleAtRisk = 'Describe who may be affected.';
  }

  if (!isNonEmptyString(b.riskLevel) || !RISK_LEVELS.includes(b.riskLevel as RiskLevel)) {
    errors.riskLevel = 'Select a risk level.';
  }

  if (!isNonEmptyString(b.reportedBy)) {
    errors.reportedBy = 'Reporter name is required.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateHazardInput };
  }

  return {
    errors: null,
    value: {
      title: (b.title as string).trim(),
      description: (b.description as string).trim(),
      reportType: b.reportType as ReportType,
      hazardCategory: b.hazardCategory as HazardCategory,
      workplace: (b.workplace as string).trim(),
      department: (b.department as string).trim(),
      location: (b.location as string).trim(),
      peopleAtRisk: (b.peopleAtRisk as string).trim(),
      immediateActionTaken: isNonEmptyString(b.immediateActionTaken)
        ? b.immediateActionTaken.trim()
        : '',
      riskLevel: b.riskLevel as RiskLevel,
      reportedBy: (b.reportedBy as string).trim(),
      assignedTo: isNonEmptyString(b.assignedTo) ? b.assignedTo.trim() : '',
      evidence: sanitizeEvidence(b.evidence),
    },
  };
}

export function validateUpdateHazard(body: unknown): ValidationResult<UpdateHazardInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateHazardInput = {};

  if (b.title !== undefined) {
    if (!isNonEmptyString(b.title)) {
      errors.title = 'Title cannot be empty.';
    } else if (b.title.trim().length > 160) {
      errors.title = 'Title must be 160 characters or fewer.';
    } else {
      value.title = b.title.trim();
    }
  }

  if (b.description !== undefined) {
    if (!isNonEmptyString(b.description)) {
      errors.description = 'Description cannot be empty.';
    } else {
      value.description = b.description.trim();
    }
  }

  if (b.reportType !== undefined) {
    if (!isNonEmptyString(b.reportType) || !REPORT_TYPES.includes(b.reportType as ReportType)) {
      errors.reportType = 'Select a valid report type.';
    } else {
      value.reportType = b.reportType as ReportType;
    }
  }

  if (b.hazardCategory !== undefined) {
    if (
      !isNonEmptyString(b.hazardCategory) ||
      !HAZARD_CATEGORIES.includes(b.hazardCategory as HazardCategory)
    ) {
      errors.hazardCategory = 'Select a valid hazard category.';
    } else {
      value.hazardCategory = b.hazardCategory as HazardCategory;
    }
  }

  if (b.workplace !== undefined) {
    if (!isNonEmptyString(b.workplace)) {
      errors.workplace = 'Workplace is required.';
    } else {
      value.workplace = b.workplace.trim();
    }
  }

  if (b.department !== undefined) {
    if (!isNonEmptyString(b.department)) {
      errors.department = 'Department is required.';
    } else {
      value.department = b.department.trim();
    }
  }

  if (b.location !== undefined) {
    if (!isNonEmptyString(b.location)) {
      errors.location = 'Specific location is required.';
    } else {
      value.location = b.location.trim();
    }
  }

  if (b.peopleAtRisk !== undefined) {
    if (!isNonEmptyString(b.peopleAtRisk)) {
      errors.peopleAtRisk = 'Describe who may be affected.';
    } else {
      value.peopleAtRisk = b.peopleAtRisk.trim();
    }
  }

  if (b.immediateActionTaken !== undefined) {
    value.immediateActionTaken = isNonEmptyString(b.immediateActionTaken)
      ? b.immediateActionTaken.trim()
      : '';
  }

  if (b.riskLevel !== undefined) {
    if (!isNonEmptyString(b.riskLevel) || !RISK_LEVELS.includes(b.riskLevel as RiskLevel)) {
      errors.riskLevel = 'Select a valid risk level.';
    } else {
      value.riskLevel = b.riskLevel as RiskLevel;
    }
  }

  if (b.status !== undefined) {
    if (!isNonEmptyString(b.status) || !HAZARD_STATUSES.includes(b.status as HazardStatus)) {
      errors.status = 'Select a valid status.';
    } else {
      value.status = b.status as HazardStatus;
    }
  }

  if (b.assignedTo !== undefined) {
    value.assignedTo = isNonEmptyString(b.assignedTo) ? b.assignedTo.trim() : '';
  }

  if (isNonEmptyString(b.actor)) {
    value.actor = b.actor.trim();
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateHazardInput };
  }

  return { errors: null, value };
}

export function validateComment(body: unknown): ValidationResult<CreateCommentInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.author)) {
    errors.author = 'Your name is required.';
  }

  if (!isNonEmptyString(b.message)) {
    errors.message = 'Comment cannot be empty.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateCommentInput };
  }

  return {
    errors: null,
    value: {
      author: (b.author as string).trim(),
      message: (b.message as string).trim(),
    },
  };
}

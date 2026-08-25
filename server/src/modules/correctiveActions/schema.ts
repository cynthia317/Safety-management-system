import type {
  CorrectiveActionSourceType,
  CorrectiveActionStatus,
  CreateCorrectiveActionCommentInput,
  CreateCorrectiveActionInput,
  EvidenceInput,
  RiskLevel,
  UpdateCorrectiveActionInput,
} from './types';

export const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];

export const CORRECTIVE_ACTION_STATUSES: CorrectiveActionStatus[] = [
  'Assigned',
  'In Progress',
  'Awaiting Verification',
  'Verified',
  'Closed',
];

export const CORRECTIVE_ACTION_SOURCE_TYPES: CorrectiveActionSourceType[] = [
  'Hazard Report',
  'Inspection',
  'Finding',
  'Audit',
  'Risk Assessment',
  'Incident',
  'Manual Entry',
];

const MAX_EVIDENCE_ITEMS = 10;
const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;

// Corrective action evidence also accepts PDFs and Word documents (the upload UI offers
// those in addition to images) — still an allow-list, not "anything goes".
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

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

export function validateCreateCorrectiveAction(body: unknown): ValidationResult<CreateCorrectiveActionInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.title)) {
    errors.title = 'Title is required.';
  } else if (b.title.trim().length > 160) {
    errors.title = 'Title must be 160 characters or fewer.';
  }

  if (!isNonEmptyString(b.description)) errors.description = 'Description is required.';
  if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace is required.';
  if (!isNonEmptyString(b.department)) errors.department = 'Department is required.';
  if (!isNonEmptyString(b.location)) errors.location = 'Specific location is required.';

  if (!isNonEmptyString(b.priority) || !RISK_LEVELS.includes(b.priority as RiskLevel)) {
    errors.priority = 'Select a priority.';
  }

  const sourceType = isNonEmptyString(b.sourceType) && CORRECTIVE_ACTION_SOURCE_TYPES.includes(b.sourceType as CorrectiveActionSourceType)
    ? (b.sourceType as CorrectiveActionSourceType)
    : 'Manual Entry';

  if (!isNonEmptyString(b.assignedTo)) errors.assignedTo = 'A responsible person must be assigned.';
  if (!isNonEmptyString(b.createdBy)) errors.createdBy = 'Creator name is required.';
  if (!isValidDate(b.dueDate)) errors.dueDate = 'Select a valid due date.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateCorrectiveActionInput };
  }

  return {
    errors: null,
    value: {
      title: (b.title as string).trim(),
      description: (b.description as string).trim(),
      workplace: (b.workplace as string).trim(),
      department: (b.department as string).trim(),
      location: (b.location as string).trim(),
      priority: b.priority as RiskLevel,
      sourceType,
      findingId: isNonEmptyString(b.findingId) ? b.findingId.trim() : null,
      findingReferenceNumber: isNonEmptyString(b.findingReferenceNumber) ? b.findingReferenceNumber.trim() : null,
      hazardId: isNonEmptyString(b.hazardId) ? b.hazardId.trim() : null,
      hazardReferenceNumber: isNonEmptyString(b.hazardReferenceNumber) ? b.hazardReferenceNumber.trim() : null,
      inspectionId: isNonEmptyString(b.inspectionId) ? b.inspectionId.trim() : null,
      inspectionReferenceNumber: isNonEmptyString(b.inspectionReferenceNumber) ? b.inspectionReferenceNumber.trim() : null,
      externalSourceReference: isNonEmptyString(b.externalSourceReference) ? b.externalSourceReference.trim() : null,
      createdBy: (b.createdBy as string).trim(),
      assignedTo: (b.assignedTo as string).trim(),
      dueDate: new Date(b.dueDate as string).toISOString(),
      evidence: sanitizeEvidence(b.evidence),
    },
  };
}

export function validateUpdateCorrectiveAction(body: unknown): ValidationResult<UpdateCorrectiveActionInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateCorrectiveActionInput = {};

  if (b.title !== undefined) {
    if (!isNonEmptyString(b.title)) errors.title = 'Title cannot be empty.';
    else value.title = b.title.trim();
  }
  if (b.description !== undefined) {
    if (!isNonEmptyString(b.description)) errors.description = 'Description cannot be empty.';
    else value.description = b.description.trim();
  }
  if (b.workplace !== undefined) {
    if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace is required.';
    else value.workplace = b.workplace.trim();
  }
  if (b.department !== undefined) {
    if (!isNonEmptyString(b.department)) errors.department = 'Department is required.';
    else value.department = b.department.trim();
  }
  if (b.location !== undefined) {
    if (!isNonEmptyString(b.location)) errors.location = 'Specific location is required.';
    else value.location = b.location.trim();
  }
  if (b.priority !== undefined) {
    if (!isNonEmptyString(b.priority) || !RISK_LEVELS.includes(b.priority as RiskLevel)) {
      errors.priority = 'Select a valid priority.';
    } else {
      value.priority = b.priority as RiskLevel;
    }
  }
  if (b.assignedTo !== undefined) {
    if (!isNonEmptyString(b.assignedTo)) errors.assignedTo = 'A responsible person must be assigned.';
    else value.assignedTo = b.assignedTo.trim();
  }
  if (b.dueDate !== undefined) {
    if (!isValidDate(b.dueDate)) errors.dueDate = 'Select a valid due date.';
    else value.dueDate = new Date(b.dueDate as string).toISOString();
  }
  if (b.responseNote !== undefined) {
    value.responseNote = isNonEmptyString(b.responseNote) ? b.responseNote.trim() : '';
  }
  if (b.evidenceNote !== undefined) {
    value.evidenceNote = isNonEmptyString(b.evidenceNote) ? b.evidenceNote.trim() : '';
  }
  if (b.verifiedBy !== undefined) {
    value.verifiedBy = isNonEmptyString(b.verifiedBy) ? b.verifiedBy.trim() : '';
  }
  if (b.status !== undefined) {
    if (!isNonEmptyString(b.status) || !CORRECTIVE_ACTION_STATUSES.includes(b.status as CorrectiveActionStatus)) {
      errors.status = 'Select a valid status.';
    } else {
      value.status = b.status as CorrectiveActionStatus;
    }
  }
  if (isNonEmptyString(b.actor)) value.actor = b.actor.trim();

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateCorrectiveActionInput };
  }

  return { errors: null, value };
}

export function validateComment(body: unknown): ValidationResult<CreateCorrectiveActionCommentInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.author)) errors.author = 'Your name is required.';
  if (!isNonEmptyString(b.message)) errors.message = 'Comment cannot be empty.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateCorrectiveActionCommentInput };
  }

  return {
    errors: null,
    value: {
      author: (b.author as string).trim(),
      message: (b.message as string).trim(),
    },
  };
}

export interface ValidatedEvidenceUpload {
  files: EvidenceInput[];
  uploadedBy: string;
}

export function validateAddEvidence(body: unknown): ValidationResult<ValidatedEvidenceUpload> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.uploadedBy)) errors.uploadedBy = 'Uploader name is required.';

  const files = sanitizeEvidence(b.files);
  if (files.length === 0) errors.files = 'Attach at least one valid file.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as ValidatedEvidenceUpload };
  }

  return { errors: null, value: { files, uploadedBy: (b.uploadedBy as string).trim() } };
}

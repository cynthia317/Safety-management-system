import { validateEvidence, MAX_AGGREGATE_EVIDENCE_BYTES } from '../../lib/evidence';
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

function sanitizeEvidence(input: unknown): { evidence: EvidenceInput[]; error?: string } {
  const { items, rejections } = validateEvidence(input, {
    maxItems: MAX_EVIDENCE_ITEMS,
    maxBytes: MAX_EVIDENCE_BYTES,
    maxTotalBytes: MAX_AGGREGATE_EVIDENCE_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });
  if (rejections.length === 0) return { evidence: items };
  return { evidence: items, error: rejections.map((r) => (r.fileName ? `${r.fileName}: ${r.reason}` : r.reason)).join(' ') };
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

  const findingId = isNonEmptyString(b.findingId) ? b.findingId.trim() : null;
  const hazardId = isNonEmptyString(b.hazardId) ? b.hazardId.trim() : null;
  const inspectionId = isNonEmptyString(b.inspectionId) ? b.inspectionId.trim() : null;
  const riskAssessmentId = isNonEmptyString(b.riskAssessmentId) ? b.riskAssessmentId.trim() : null;
  const incidentId = isNonEmptyString(b.incidentId) ? b.incidentId.trim() : null;
  const sourceLinkCount = [findingId, hazardId, inspectionId, riskAssessmentId, incidentId].filter((v) => v !== null).length;
  if (sourceLinkCount > 1) {
    errors.sourceType = 'A corrective action can only be linked to one source record.';
  }

  const { evidence, error: evidenceError } = sanitizeEvidence(b.evidence);
  if (evidenceError) {
    errors.evidence = evidenceError;
  }

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
      findingId,
      findingReferenceNumber: isNonEmptyString(b.findingReferenceNumber) ? b.findingReferenceNumber.trim() : null,
      hazardId,
      hazardReferenceNumber: isNonEmptyString(b.hazardReferenceNumber) ? b.hazardReferenceNumber.trim() : null,
      inspectionId,
      inspectionReferenceNumber: isNonEmptyString(b.inspectionReferenceNumber) ? b.inspectionReferenceNumber.trim() : null,
      riskAssessmentId,
      riskAssessmentReferenceNumber: isNonEmptyString(b.riskAssessmentReferenceNumber)
        ? b.riskAssessmentReferenceNumber.trim()
        : null,
      incidentId,
      incidentReferenceNumber: isNonEmptyString(b.incidentReferenceNumber) ? b.incidentReferenceNumber.trim() : null,
      externalSourceReference: isNonEmptyString(b.externalSourceReference) ? b.externalSourceReference.trim() : null,
      createdBy: (b.createdBy as string).trim(),
      assignedTo: (b.assignedTo as string).trim(),
      dueDate: new Date(b.dueDate as string).toISOString(),
      evidence,
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

  const { evidence: files, error: evidenceError } = sanitizeEvidence(b.files);
  if (evidenceError) {
    errors.files = evidenceError;
  } else if (files.length === 0) {
    errors.files = 'Attach at least one valid file.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as ValidatedEvidenceUpload };
  }

  return { errors: null, value: { files, uploadedBy: (b.uploadedBy as string).trim() } };
}

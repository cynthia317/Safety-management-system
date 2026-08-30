import { validateEvidence } from '../../lib/evidence';
import type {
  CreateIncidentCommentInput,
  CreateIncidentInput,
  EventType,
  EvidenceInput,
  IncidentCategory,
  IncidentStatus,
  InjurySeverity,
  Severity,
  UpdateIncidentInput,
} from './types';

// Matches Corrective Action's evidence allow-list/limits — Phase 6 decision — since
// incident evidence realistically includes both scene photos and written reports.
const MAX_EVIDENCE_ITEMS = 10;
const MAX_EVIDENCE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function sanitizeEvidence(input: unknown): { evidence: ReturnType<typeof validateEvidence>['items']; error?: string } {
  const { items, rejections } = validateEvidence(input, {
    maxItems: MAX_EVIDENCE_ITEMS,
    maxBytes: MAX_EVIDENCE_BYTES,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });
  if (rejections.length === 0) return { evidence: items };
  return { evidence: items, error: rejections.map((r) => (r.fileName ? `${r.fileName}: ${r.reason}` : r.reason)).join(' ') };
}

export const EVENT_TYPES: EventType[] = ['Incident', 'NearMiss'];

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  'Injury/Illness',
  'Property Damage',
  'Environmental',
  'Fire',
  'Equipment',
  'Vehicle',
  'Security',
  'Other',
];

export const SEVERITIES: Severity[] = ['Low', 'Medium', 'High', 'Critical'];

export const INJURY_SEVERITIES: InjurySeverity[] = ['None', 'First Aid', 'Medical Treatment', 'Lost Time', 'Fatality'];

export const INCIDENT_STATUSES: IncidentStatus[] = [
  'Reported',
  'Under Investigation',
  'Action Required',
  'Resolved',
  'Closed',
];

/**
 * Explicit status transition graph — PATCH accepting a `status` field does not mean any
 * status is reachable from any other. `Closed -> Resolved` is the only reopen edge; the
 * controller additionally requires EHS Officer/Admin for that specific edge (see
 * incidents/controller.ts), same authority as closing.
 */
export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  Reported: ['Under Investigation'],
  'Under Investigation': ['Action Required', 'Resolved'],
  'Action Required': ['Resolved'],
  Resolved: ['Closed'],
  Closed: ['Resolved'],
};

export function isValidStatusTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  if (from === to) return false;
  return STATUS_TRANSITIONS[from].includes(to);
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

export function validateCreateIncident(body: unknown): ValidationResult<CreateIncidentInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.eventType) || !EVENT_TYPES.includes(b.eventType as EventType)) {
    errors.eventType = 'Select Incident or Near Miss.';
  }
  if (!isNonEmptyString(b.category) || !INCIDENT_CATEGORIES.includes(b.category as IncidentCategory)) {
    errors.category = 'Select a category.';
  }
  if (!isNonEmptyString(b.title)) {
    errors.title = 'Title is required.';
  } else if (b.title.trim().length > 160) {
    errors.title = 'Title must be 160 characters or fewer.';
  }
  if (!isNonEmptyString(b.description)) errors.description = 'Description is required — describe what happened.';
  if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace is required.';
  if (!isNonEmptyString(b.department)) errors.department = 'Department is required.';
  if (!isNonEmptyString(b.location)) errors.location = 'Specific location is required.';
  if (!isValidDate(b.eventDate)) errors.eventDate = 'Select a valid event date.';

  if (!isNonEmptyString(b.actualSeverity) || !SEVERITIES.includes(b.actualSeverity as Severity)) {
    errors.actualSeverity = 'Select the actual severity.';
  }
  if (!isNonEmptyString(b.potentialSeverity) || !SEVERITIES.includes(b.potentialSeverity as Severity)) {
    errors.potentialSeverity = 'Select the potential severity.';
  }

  const injuryOccurred = b.injuryOccurred === true;
  let injurySeverity: InjurySeverity | null = null;
  if (injuryOccurred) {
    if (!isNonEmptyString(b.injurySeverity) || !INJURY_SEVERITIES.includes(b.injurySeverity as InjurySeverity)) {
      errors.injurySeverity = 'Select an injury severity.';
    } else {
      injurySeverity = b.injurySeverity as InjurySeverity;
    }
  }

  const hazardId = isNonEmptyString(b.hazardId) ? b.hazardId.trim() : null;

  const { evidence, error: evidenceError } = sanitizeEvidence(b.evidence);
  if (evidenceError) errors.evidence = evidenceError;

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateIncidentInput };
  }

  return {
    errors: null,
    value: {
      eventType: b.eventType as EventType,
      category: b.category as IncidentCategory,
      title: (b.title as string).trim(),
      description: (b.description as string).trim(),
      workplace: (b.workplace as string).trim(),
      department: (b.department as string).trim(),
      location: (b.location as string).trim(),
      eventDate: new Date(b.eventDate as string).toISOString(),
      peopleInvolved: isNonEmptyString(b.peopleInvolved) ? b.peopleInvolved.trim() : '',
      injuryOccurred,
      injurySeverity,
      immediateActionTaken: isNonEmptyString(b.immediateActionTaken) ? b.immediateActionTaken.trim() : '',
      actualSeverity: b.actualSeverity as Severity,
      potentialSeverity: b.potentialSeverity as Severity,
      hazardId,
      evidence,
    },
  };
}

export function validateUpdateIncident(body: unknown): ValidationResult<UpdateIncidentInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateIncidentInput = {};

  if (b.eventType !== undefined) {
    if (!isNonEmptyString(b.eventType) || !EVENT_TYPES.includes(b.eventType as EventType)) {
      errors.eventType = 'Select Incident or Near Miss.';
    } else {
      value.eventType = b.eventType as EventType;
    }
  }
  if (b.category !== undefined) {
    if (!isNonEmptyString(b.category) || !INCIDENT_CATEGORIES.includes(b.category as IncidentCategory)) {
      errors.category = 'Select a valid category.';
    } else {
      value.category = b.category as IncidentCategory;
    }
  }
  if (b.title !== undefined) {
    if (!isNonEmptyString(b.title)) errors.title = 'Title cannot be empty.';
    else if (b.title.trim().length > 160) errors.title = 'Title must be 160 characters or fewer.';
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
  if (b.eventDate !== undefined) {
    if (!isValidDate(b.eventDate)) errors.eventDate = 'Select a valid event date.';
    else value.eventDate = new Date(b.eventDate as string).toISOString();
  }
  if (b.peopleInvolved !== undefined) {
    value.peopleInvolved = isNonEmptyString(b.peopleInvolved) ? b.peopleInvolved.trim() : '';
  }
  if (b.injuryOccurred !== undefined) {
    value.injuryOccurred = b.injuryOccurred === true;
  }
  if (b.injurySeverity !== undefined) {
    if (b.injurySeverity === null) {
      value.injurySeverity = null;
    } else if (!isNonEmptyString(b.injurySeverity) || !INJURY_SEVERITIES.includes(b.injurySeverity as InjurySeverity)) {
      errors.injurySeverity = 'Select a valid injury severity.';
    } else {
      value.injurySeverity = b.injurySeverity as InjurySeverity;
    }
  }
  if (b.immediateActionTaken !== undefined) {
    value.immediateActionTaken = isNonEmptyString(b.immediateActionTaken) ? b.immediateActionTaken.trim() : '';
  }
  if (b.actualSeverity !== undefined) {
    if (!isNonEmptyString(b.actualSeverity) || !SEVERITIES.includes(b.actualSeverity as Severity)) {
      errors.actualSeverity = 'Select a valid actual severity.';
    } else {
      value.actualSeverity = b.actualSeverity as Severity;
    }
  }
  if (b.potentialSeverity !== undefined) {
    if (!isNonEmptyString(b.potentialSeverity) || !SEVERITIES.includes(b.potentialSeverity as Severity)) {
      errors.potentialSeverity = 'Select a valid potential severity.';
    } else {
      value.potentialSeverity = b.potentialSeverity as Severity;
    }
  }
  if (b.status !== undefined) {
    if (!isNonEmptyString(b.status) || !INCIDENT_STATUSES.includes(b.status as IncidentStatus)) {
      errors.status = 'Select a valid status.';
    } else {
      value.status = b.status as IncidentStatus;
    }
  }
  if (b.leadInvestigator !== undefined) {
    value.leadInvestigator = isNonEmptyString(b.leadInvestigator) ? b.leadInvestigator.trim() : '';
  }
  if (b.investigationSummary !== undefined) {
    value.investigationSummary = isNonEmptyString(b.investigationSummary) ? b.investigationSummary.trim() : '';
  }
  if (b.rootCause !== undefined) {
    value.rootCause = isNonEmptyString(b.rootCause) ? b.rootCause.trim() : '';
  }
  if (b.contributingFactors !== undefined) {
    value.contributingFactors = isNonEmptyString(b.contributingFactors) ? b.contributingFactors.trim() : '';
  }
  if (b.lessonsLearned !== undefined) {
    value.lessonsLearned = isNonEmptyString(b.lessonsLearned) ? b.lessonsLearned.trim() : '';
  }
  if (b.hazardId !== undefined) {
    value.hazardId = isNonEmptyString(b.hazardId) ? b.hazardId.trim() : null;
  }
  if (isNonEmptyString(b.actor)) {
    value.actor = b.actor.trim();
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateIncidentInput };
  }

  return { errors: null, value };
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

export function validateComment(body: unknown): ValidationResult<CreateIncidentCommentInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.author)) errors.author = 'Your name is required.';
  if (!isNonEmptyString(b.message)) errors.message = 'Comment cannot be empty.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateIncidentCommentInput };
  }

  return {
    errors: null,
    value: {
      author: (b.author as string).trim(),
      message: (b.message as string).trim(),
    },
  };
}

import type {
  CreateFindingCommentInput,
  CreateFindingFromResponseInput,
  CreateFindingInput,
  FindingStatus,
  RiskLevel,
  UpdateFindingInput,
} from './types';

export const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Critical'];

export const FINDING_STATUSES: FindingStatus[] = ['Open', 'In Progress', 'Awaiting Verification', 'Closed'];

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

export function validateCreateFinding(body: unknown): ValidationResult<CreateFindingInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.title)) {
    errors.title = 'Title is required.';
  } else if (b.title.trim().length > 160) {
    errors.title = 'Title must be 160 characters or fewer.';
  }

  if (!isNonEmptyString(b.description)) {
    errors.description = 'Description is required.';
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

  if (!isNonEmptyString(b.riskLevel) || !RISK_LEVELS.includes(b.riskLevel as RiskLevel)) {
    errors.riskLevel = 'Select a risk level.';
  }

  if (!isNonEmptyString(b.createdBy)) {
    errors.createdBy = 'Creator name is required.';
  }

  if (!isValidDate(b.dueDate)) {
    errors.dueDate = 'Select a valid due date.';
  }

  const hasHazardLink = isNonEmptyString(b.hazardId);
  const hasInspectionLink = isNonEmptyString(b.inspectionId);
  if (hasHazardLink && hasInspectionLink) {
    errors.hazardId = 'A finding can only be linked to one source record.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateFindingInput };
  }

  return {
    errors: null,
    value: {
      title: (b.title as string).trim(),
      description: (b.description as string).trim(),
      workplace: (b.workplace as string).trim(),
      department: (b.department as string).trim(),
      location: (b.location as string).trim(),
      riskLevel: b.riskLevel as RiskLevel,
      hazardId: isNonEmptyString(b.hazardId) ? b.hazardId.trim() : null,
      hazardReferenceNumber: isNonEmptyString(b.hazardReferenceNumber) ? b.hazardReferenceNumber.trim() : null,
      inspectionId: isNonEmptyString(b.inspectionId) ? b.inspectionId.trim() : null,
      inspectionReferenceNumber: isNonEmptyString(b.inspectionReferenceNumber)
        ? b.inspectionReferenceNumber.trim()
        : null,
      createdBy: (b.createdBy as string).trim(),
      assignedTo: isNonEmptyString(b.assignedTo) ? b.assignedTo.trim() : '',
      dueDate: new Date(b.dueDate as string).toISOString(),
    },
  };
}

export function validateUpdateFinding(body: unknown): ValidationResult<UpdateFindingInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateFindingInput = {};

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

  if (b.riskLevel !== undefined) {
    if (!isNonEmptyString(b.riskLevel) || !RISK_LEVELS.includes(b.riskLevel as RiskLevel)) {
      errors.riskLevel = 'Select a valid risk level.';
    } else {
      value.riskLevel = b.riskLevel as RiskLevel;
    }
  }

  if (b.status !== undefined) {
    if (!isNonEmptyString(b.status) || !FINDING_STATUSES.includes(b.status as FindingStatus)) {
      errors.status = 'Select a valid status.';
    } else {
      value.status = b.status as FindingStatus;
    }
  }

  if (b.assignedTo !== undefined) {
    value.assignedTo = isNonEmptyString(b.assignedTo) ? b.assignedTo.trim() : '';
  }

  if (b.dueDate !== undefined) {
    if (!isValidDate(b.dueDate)) {
      errors.dueDate = 'Select a valid due date.';
    } else {
      value.dueDate = new Date(b.dueDate as string).toISOString();
    }
  }

  if (isNonEmptyString(b.actor)) {
    value.actor = b.actor.trim();
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateFindingInput };
  }

  return { errors: null, value };
}

// Workplace/department/location are deliberately not accepted here — for a finding
// created from a flagged inspection response, those always come from the inspection
// itself (see findings/service.ts#createFindingFromInspectionResponse), not the client,
// so there's no cross-workplace value to validate against in the first place.
export function validateCreateFindingFromResponse(body: unknown): ValidationResult<CreateFindingFromResponseInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.title)) {
    errors.title = 'Title is required.';
  } else if (b.title.trim().length > 160) {
    errors.title = 'Title must be 160 characters or fewer.';
  }

  if (!isNonEmptyString(b.description)) {
    errors.description = 'Description is required.';
  }

  if (!isNonEmptyString(b.riskLevel) || !RISK_LEVELS.includes(b.riskLevel as RiskLevel)) {
    errors.riskLevel = 'Select a risk level.';
  }

  if (!isValidDate(b.dueDate)) {
    errors.dueDate = 'Select a valid due date.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateFindingFromResponseInput };
  }

  return {
    errors: null,
    value: {
      title: (b.title as string).trim(),
      description: (b.description as string).trim(),
      riskLevel: b.riskLevel as RiskLevel,
      assignedTo: isNonEmptyString(b.assignedTo) ? b.assignedTo.trim() : '',
      dueDate: new Date(b.dueDate as string).toISOString(),
      createdBy: '', // overwritten by the controller with the authenticated caller's name
    },
  };
}

export function validateComment(body: unknown): ValidationResult<CreateFindingCommentInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.author)) {
    errors.author = 'Your name is required.';
  }

  if (!isNonEmptyString(b.message)) {
    errors.message = 'Comment cannot be empty.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateFindingCommentInput };
  }

  return {
    errors: null,
    value: {
      author: (b.author as string).trim(),
      message: (b.message as string).trim(),
    },
  };
}

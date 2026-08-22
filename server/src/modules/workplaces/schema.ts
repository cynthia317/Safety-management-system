import type {
  AreaInput,
  CreateWorkplaceInput,
  LocationInput,
  UpdateWorkplaceInput,
  WorkplaceStatus,
} from './types';

export const WORKPLACE_STATUSES: WorkplaceStatus[] = ['Active', 'Inactive'];

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

function sanitizeLocation(raw: unknown, index: number): LocationInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const l = raw as Record<string, unknown>;

  if (!isNonEmptyString(l.name)) return null;

  return {
    id: isNonEmptyString(l.id) ? l.id : undefined,
    name: l.name.trim(),
    description: isNonEmptyString(l.description) ? l.description.trim() : '',
    order: typeof l.order === 'number' ? l.order : index,
  };
}

function sanitizeLocations(value: unknown): LocationInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((l, i) => sanitizeLocation(l, i)).filter((l): l is LocationInput => l !== null);
}

function sanitizeArea(raw: unknown, index: number): AreaInput | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;

  if (!isNonEmptyString(a.name)) return null;

  return {
    id: isNonEmptyString(a.id) ? a.id : undefined,
    name: a.name.trim(),
    description: isNonEmptyString(a.description) ? a.description.trim() : '',
    order: typeof a.order === 'number' ? a.order : index,
    locations: sanitizeLocations(a.locations),
  };
}

function sanitizeAreas(value: unknown): AreaInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((a, i) => sanitizeArea(a, i)).filter((a): a is AreaInput => a !== null);
}

export function validateCreateWorkplace(body: unknown): ValidationResult<CreateWorkplaceInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.organisation)) errors.organisation = 'Organisation is required.';
  if (!isNonEmptyString(b.name)) errors.name = 'Workplace / site name is required.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as CreateWorkplaceInput };
  }

  return {
    errors: null,
    value: {
      organisation: (b.organisation as string).trim(),
      name: (b.name as string).trim(),
      code: isNonEmptyString(b.code) ? b.code.trim().toUpperCase() : '',
      industry: isNonEmptyString(b.industry) ? b.industry.trim() : '',
      address: isNonEmptyString(b.address) ? b.address.trim() : '',
      areas: sanitizeAreas(b.areas),
    },
  };
}

export function validateUpdateWorkplace(body: unknown): ValidationResult<UpdateWorkplaceInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateWorkplaceInput = {};

  if (b.organisation !== undefined) {
    if (!isNonEmptyString(b.organisation)) errors.organisation = 'Organisation cannot be empty.';
    else value.organisation = b.organisation.trim();
  }

  if (b.name !== undefined) {
    if (!isNonEmptyString(b.name)) errors.name = 'Workplace / site name cannot be empty.';
    else value.name = b.name.trim();
  }

  if (b.code !== undefined) {
    value.code = isNonEmptyString(b.code) ? b.code.trim().toUpperCase() : '';
  }

  if (b.industry !== undefined) {
    value.industry = isNonEmptyString(b.industry) ? b.industry.trim() : '';
  }

  if (b.address !== undefined) {
    value.address = isNonEmptyString(b.address) ? b.address.trim() : '';
  }

  if (b.status !== undefined) {
    if (!isNonEmptyString(b.status) || !WORKPLACE_STATUSES.includes(b.status as WorkplaceStatus)) {
      errors.status = 'Select a valid status.';
    } else {
      value.status = b.status as WorkplaceStatus;
    }
  }

  if (b.areas !== undefined) {
    value.areas = sanitizeAreas(b.areas);
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateWorkplaceInput };
  }

  return { errors: null, value };
}

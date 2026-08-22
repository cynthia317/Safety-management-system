import { ROLES } from './types';
import type { AdminUpdateUserInput, ChangePasswordInput, LoginInput, RegisterInput, Role, UpdateProfileInput } from './types';

export type ValidationErrors = Record<string, string>;

export interface ValidationResult<T> {
  errors: ValidationErrors | null;
  value: T;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidEmail(value: unknown): value is string {
  return isNonEmptyString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
}

// Self-service registration can never grant Admin — that has to come from an existing
// Admin via the Users management screen. Enforced here too, not just hidden client-side,
// since the client's role list is only a UI convenience.
const SELF_REGISTER_ROLES: Role[] = ROLES.filter((r) => r !== 'Admin');

export function validateRegister(body: unknown): ValidationResult<RegisterInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.name)) errors.name = 'Name is required.';
  if (!isValidEmail(b.email)) errors.email = 'Enter a valid email address.';
  if (!isNonEmptyString(b.password) || b.password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace is required.';
  if (!isNonEmptyString(b.role) || !SELF_REGISTER_ROLES.includes(b.role as Role)) errors.role = 'Select a valid role.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as RegisterInput };
  }

  return {
    errors: null,
    value: {
      name: (b.name as string).trim(),
      email: (b.email as string).trim().toLowerCase(),
      password: b.password as string,
      role: b.role as Role,
      workplace: (b.workplace as string).trim(),
    },
  };
}

export function validateLogin(body: unknown): ValidationResult<LoginInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isValidEmail(b.email)) errors.email = 'Enter a valid email address.';
  if (!isNonEmptyString(b.password)) errors.password = 'Password is required.';

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as LoginInput };
  }

  return { errors: null, value: { email: (b.email as string).trim().toLowerCase(), password: b.password as string } };
}

export function validateUpdateProfile(body: unknown): ValidationResult<UpdateProfileInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: UpdateProfileInput = {};

  if (b.name !== undefined) {
    if (!isNonEmptyString(b.name)) errors.name = 'Name cannot be empty.';
    else value.name = b.name.trim();
  }

  if (b.workplace !== undefined) {
    if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace cannot be empty.';
    else value.workplace = b.workplace.trim();
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as UpdateProfileInput };
  }

  return { errors: null, value };
}

export function validateChangePassword(body: unknown): ValidationResult<ChangePasswordInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};

  if (!isNonEmptyString(b.currentPassword)) errors.currentPassword = 'Current password is required.';
  if (!isNonEmptyString(b.newPassword) || (b.newPassword as string).length < 8) {
    errors.newPassword = 'New password must be at least 8 characters.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as ChangePasswordInput };
  }

  return {
    errors: null,
    value: { currentPassword: b.currentPassword as string, newPassword: b.newPassword as string },
  };
}

export function validateAdminUpdateUser(body: unknown): ValidationResult<AdminUpdateUserInput> {
  const b = asRecord(body);
  const errors: ValidationErrors = {};
  const value: AdminUpdateUserInput = {};

  if (b.role !== undefined) {
    if (!isNonEmptyString(b.role) || !ROLES.includes(b.role as Role)) errors.role = 'Select a valid role.';
    else value.role = b.role as Role;
  }

  if (b.workplace !== undefined) {
    if (!isNonEmptyString(b.workplace)) errors.workplace = 'Workplace cannot be empty.';
    else value.workplace = b.workplace.trim();
  }

  if (b.isActive !== undefined) {
    if (typeof b.isActive !== 'boolean') errors.isActive = 'isActive must be true or false.';
    else value.isActive = b.isActive;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, value: undefined as unknown as AdminUpdateUserInput };
  }

  return { errors: null, value };
}

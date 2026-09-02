import { apiRequest } from './api';
import type {
  AdminUpdateUserPayload,
  AssignableUser,
  ChangePasswordPayload,
  LoginPayload,
  UpdateProfilePayload,
  User,
} from './authTypes';

interface DataEnvelope<T> {
  data: T;
}

export function login(payload: LoginPayload): Promise<User> {
  return apiRequest<DataEnvelope<User>>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

// Phase 0 (multi-organisation security hardening): public self-registration has been
// removed server-side (no POST /api/auth/register route exists any more — see
// server/src/modules/auth/routes.ts). Account creation is out-of-band until Phase C's
// organisation-scoped invite flow ships; there is deliberately no client function for it.

export function logout(): Promise<void> {
  return apiRequest<void>('/api/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<User> {
  return apiRequest<DataEnvelope<User>>('/api/auth/me').then((res) => res.data);
}

/** Full user directory (email, workplace, active status) — Admin only. Used by Settings > Users. */
export function listUsers(): Promise<User[]> {
  return apiRequest<DataEnvelope<User[]>>('/api/users').then((res) => res.data);
}

/** Least-privilege "assign to" directory (name + role only), scoped to the caller's
 * workplace on the server. Used by every assignment picker.
 *
 * `workplace` optionally scopes the directory to a specific record's workplace instead of
 * the caller's own — needed when an org-wide Admin is assigning a specific record and must
 * only be offered that record's own workplace roster, not every workplace's. Ignored
 * server-side for a non-Admin caller, who is always scoped to their own workplace anyway. */
export function listAssignableUsers(workplace?: string): Promise<AssignableUser[]> {
  const query = workplace ? `?workplace=${encodeURIComponent(workplace)}` : '';
  return apiRequest<DataEnvelope<AssignableUser[]>>(`/api/users/assignable${query}`).then((res) => res.data);
}

export function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return apiRequest<DataEnvelope<User>>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function changePassword(payload: ChangePasswordPayload): Promise<void> {
  return apiRequest<void>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function adminUpdateUser(id: string, payload: AdminUpdateUserPayload): Promise<User> {
  return apiRequest<DataEnvelope<User>>(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

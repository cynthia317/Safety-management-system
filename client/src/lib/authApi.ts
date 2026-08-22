import { apiRequest } from './api';
import type {
  AdminUpdateUserPayload,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
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

export function register(payload: RegisterPayload): Promise<User> {
  return apiRequest<DataEnvelope<User>>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((res) => res.data);
}

export function logout(): Promise<void> {
  return apiRequest<void>('/api/auth/logout', { method: 'POST' });
}

export function getMe(): Promise<User> {
  return apiRequest<DataEnvelope<User>>('/api/auth/me').then((res) => res.data);
}

export function listUsers(): Promise<User[]> {
  return apiRequest<DataEnvelope<User[]>>('/api/users').then((res) => res.data);
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

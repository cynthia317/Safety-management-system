import type { Role } from './roles';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  workplace: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  workplace: string;
}

export interface UpdateProfilePayload {
  name?: string;
  workplace?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface AdminUpdateUserPayload {
  role?: Role;
  workplace?: string;
  isActive?: boolean;
}

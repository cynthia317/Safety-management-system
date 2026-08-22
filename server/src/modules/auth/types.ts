export type Role = 'Worker' | 'Supervisor' | 'EHS Officer' | 'Manager' | 'Admin';

export const ROLES: Role[] = ['Worker', 'Supervisor', 'EHS Officer', 'Manager', 'Admin'];

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  workplace: string;
  isActive: boolean;
  createdAt: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  workplace: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  workplace?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface AdminUpdateUserInput {
  role?: Role;
  workplace?: string;
  isActive?: boolean;
}

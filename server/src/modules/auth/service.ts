import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import type { User as PrismaUser } from '@prisma/client';
import type { AdminUpdateUserInput, ChangePasswordInput, PublicUser, RegisterInput, Role, UpdateProfileInput, User } from './types';

const SALT_ROUNDS = 10;
export const DEMO_PASSWORD = 'password123';

function fromRow(row: PrismaUser): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role as Role,
    workplace: row.workplace,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

function toPublic(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function findByEmail(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase();
  const row = await prisma.user.findFirst({ where: { email: normalized } });
  return row ? fromRow(row) : undefined;
}

export async function getUser(id: string): Promise<User | undefined> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? fromRow(row) : undefined;
}

// This runs on every authenticated request (requireAuth), so it selects only the columns
// PublicUser needs — skipping passwordHash avoids fetching/serializing it on the hottest
// query path in the app, unlike getUser() which callers that verify a password still need.
export async function getPublicUser(id: string): Promise<PublicUser | undefined> {
  const row = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, workplace: true, isActive: true, createdAt: true },
  });
  if (!row) return undefined;
  return { ...row, role: row.role as Role, createdAt: row.createdAt.toISOString() };
}

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  return rows.map((row) => toPublic(fromRow(row)));
}

export interface AssignableUser {
  id: string;
  name: string;
  role: Role;
}

// Least-privilege directory for "assign to" / "responsible person" pickers, used by every
// non-admin workflow (corrective actions, findings, hazards, inspections). Deliberately
// omits email/workplace/isActive/createdAt — those pickers only ever render `.name` and
// `.role` (see client/src/lib/useUsers.ts and its callers), so there is no reason to send
// the rest to every authenticated user the way the full `listUsers()` directory does.
//
// Scoped to the requester's own workplace so a user can't harvest another site's roster
// through the assignment dropdown; Admin (organisation-wide access) sees everyone by
// default. `workplace`, when given, scopes the roster to that specific workplace instead —
// e.g. an Admin assigning a particular record should only be offered that record's own
// workplace, not every site. It's ignored for a non-Admin caller: they're always scoped to
// their own workplace regardless (they have no legitimate reason to browse another site's
// roster, and every record they can even see is already at their own workplace anyway).
export async function listAssignableUsers(requestingUser: PublicUser, workplace?: string): Promise<AssignableUser[]> {
  const isAdmin = requestingUser.role === 'Admin';
  const scopeWorkplace = isAdmin ? workplace : requestingUser.workplace;
  const rows = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(scopeWorkplace ? { workplace: { equals: scopeWorkplace, mode: 'insensitive' } } : {}),
    },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  });
  return rows.map((row) => ({ id: row.id, name: row.name, role: row.role as Role }));
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}

export async function createUser(input: RegisterInput): Promise<PublicUser> {
  const row = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: bcrypt.hashSync(input.password, SALT_ROUNDS),
      role: input.role,
      workplace: input.workplace,
      isActive: true,
    },
  });
  return toPublic(fromRow(row));
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<PublicUser | undefined> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return undefined;

  const row = await prisma.user.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      workplace: input.workplace ?? existing.workplace,
    },
  });
  return toPublic(fromRow(row));
}

export async function changePassword(
  id: string,
  input: ChangePasswordInput,
): Promise<'ok' | 'not_found' | 'invalid_current_password'> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return 'not_found';
  if (!bcrypt.compareSync(input.currentPassword, existing.passwordHash)) return 'invalid_current_password';

  await prisma.user.update({
    where: { id },
    data: { passwordHash: bcrypt.hashSync(input.newPassword, SALT_ROUNDS) },
  });
  return 'ok';
}

export async function adminUpdateUser(
  id: string,
  input: AdminUpdateUserInput,
): Promise<PublicUser | 'not_found' | 'last_admin_lockout'> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return 'not_found';

  // Refuse to demote/deactivate the last active Admin — there would be no one left who
  // could undo it, since only Admins can manage users.
  const losingAdminAccess =
    existing.role === 'Admin' &&
    existing.isActive &&
    ((input.role !== undefined && input.role !== 'Admin') || input.isActive === false);

  if (losingAdminAccess) {
    const otherActiveAdmins = await prisma.user.count({
      where: { id: { not: id }, role: 'Admin', isActive: true },
    });
    if (otherActiveAdmins === 0) return 'last_admin_lockout';
  }

  const row = await prisma.user.update({
    where: { id },
    data: {
      role: input.role ?? existing.role,
      workplace: input.workplace ?? existing.workplace,
      isActive: input.isActive ?? existing.isActive,
    },
  });
  return toPublic(fromRow(row));
}

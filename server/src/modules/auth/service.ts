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

export async function getPublicUser(id: string): Promise<PublicUser | undefined> {
  const user = await getUser(id);
  return user ? toPublic(user) : undefined;
}

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  return rows.map((row) => toPublic(fromRow(row)));
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

import type { Request, Response } from 'express';
import * as authService from './service';
import {
  validateAdminUpdateUser,
  validateChangePassword,
  validateLogin,
  validateRegister,
  validateUpdateProfile,
} from './schema';

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateRegister(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  if (await authService.findByEmail(value.email)) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: { email: 'An account with this email already exists.' } },
    });
    return;
  }

  const user = await authService.createUser(value);
  req.session.userId = user.id;
  res.status(201).json({ data: user });
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateLogin(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const user = await authService.findByEmail(value.email);
  if (!user || !authService.verifyPassword(user, value.password)) {
    res.status(401).json({
      error: { code: 'INVALID_CREDENTIALS', message: 'Incorrect email or password.' },
    });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({
      error: { code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated. Contact an administrator.' },
    });
    return;
  }

  req.session.userId = user.id;
  res.json({ data: await authService.getPublicUser(user.id) });
}

export async function updateProfileHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateUpdateProfile(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  // Which workplace a user belongs to is the root input to every workplace-scoping check
  // in the app (workplaceScopeWhere/canAccessRecordWorkplace) — letting a scoped user
  // change it themselves would let them grant themselves access to any other workplace's
  // records on their very next request. Only Admin (already organisation-wide) may change
  // it here; every other role goes through the Admin-only adminUpdateUserHandler instead.
  // Silently dropped rather than rejected, the same way a Worker's client-supplied
  // assignedTo is on hazard creation, so a direct API call can't move a scoped user's data
  // access to another workplace no matter what it sends.
  if (req.user!.role !== 'Admin') {
    delete value.workplace;
  }

  const updated = await authService.updateProfile(req.user!.id, value);
  res.json({ data: updated });
}

export async function changePasswordHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateChangePassword(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const result = await authService.changePassword(req.user!.id, value);

  if (result === 'invalid_current_password') {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: { currentPassword: 'Current password is incorrect.' } },
    });
    return;
  }

  res.status(204).end();
}

export async function adminUpdateUserHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { errors, value } = validateAdminUpdateUser(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const result = await authService.adminUpdateUser(id, value);

  if (result === 'not_found') {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `User "${id}" was not found.` } });
    return;
  }

  if (result === 'last_admin_lockout') {
    res.status(400).json({
      error: {
        code: 'LAST_ADMIN_LOCKOUT',
        message: 'This is the last active Admin — deactivate or change another Admin first.',
      },
    });
    return;
  }

  res.json({ data: result });
}

export function logoutHandler(req: Request, res: Response): void {
  req.session.destroy(() => {
    res.status(204).end();
  });
}

export function meHandler(req: Request, res: Response): void {
  res.json({ data: req.user });
}

export async function listUsersHandler(_req: Request, res: Response): Promise<void> {
  res.json({ data: await authService.listUsers() });
}

export async function listAssignableUsersHandler(req: Request, res: Response): Promise<void> {
  const workplace =
    typeof req.query.workplace === 'string' && req.query.workplace.trim().length > 0
      ? req.query.workplace.trim()
      : undefined;
  res.json({ data: await authService.listAssignableUsers(req.user!, workplace) });
}

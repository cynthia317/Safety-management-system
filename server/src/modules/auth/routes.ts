import { Router } from 'express';
import {
  adminUpdateUserHandler,
  changePasswordHandler,
  loginHandler,
  listAssignableUsersHandler,
  listUsersHandler,
  logoutHandler,
  meHandler,
  updateProfileHandler,
} from './controller';
import { requireAuth, requireRole } from './middleware';
import { authAttemptLimiter, sensitiveAccountLimiter } from '../../lib/rateLimiters';

export const authRouter = Router();

// Phase 0 (multi-organisation security hardening): public self-registration is
// permanently removed, not merely hidden. There is deliberately no route at this path —
// POST /api/auth/register now falls through to app.ts's catch-all 404, the same as any
// other nonexistent endpoint, rather than a 403 that would confirm the path once existed.
// There is intentionally no replacement account-creation endpoint yet: adminUpdateUserHandler
// below only updates an existing user, it does not create one. Until Phase C's
// organisation-scoped invite flow ships, new accounts are provisioned out-of-band (direct
// database access by an operator) — existing accounts are entirely unaffected by this change.
authRouter.post('/login', authAttemptLimiter, loginHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
authRouter.patch('/me', requireAuth, updateProfileHandler);
authRouter.post('/change-password', requireAuth, sensitiveAccountLimiter, changePasswordHandler);

export const usersRouter = Router();

// Least-privilege "assign to" directory (name + role only) — any authenticated user needs
// this to populate assignment pickers. Must be registered before the admin-only full
// directory below isn't relevant (different path), but keep it above `/:id`-shaped routes
// on principle so a literal segment never risks being swallowed by a param route.
usersRouter.get('/assignable', requireAuth, listAssignableUsersHandler);
// Full directory (email, workplace, active status) — Admin only; the only page that reads
// it is Settings > Users, which is already Admin-gated in the UI, but the server must be
// the actual boundary. See docs: server/src/modules/auth/service.ts#listAssignableUsers.
usersRouter.get('/', requireAuth, requireRole('Admin'), listUsersHandler);
usersRouter.patch('/:id', requireAuth, requireRole('Admin'), adminUpdateUserHandler);

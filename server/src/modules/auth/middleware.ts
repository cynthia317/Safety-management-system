import type { NextFunction, Request, Response } from 'express';
import 'express-session';
import { getPublicUser } from './service';
import type { PublicUser, Role } from './types';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

// TEMPORARILY DISABLED — sign-in was blocking usable testing (no live database to
// authenticate against yet). Still tries the real session first, so a real login
// keeps attributing actions correctly; only falls back to a synthetic user instead
// of a 401. To re-enable: delete the fallback below and restore the 401.
const AUTH_DISABLED_USER: PublicUser = {
  id: 'auth-disabled',
  name: 'Guest',
  email: 'guest@safetyos.local',
  role: 'Admin',
  workplace: '',
  isActive: true,
  createdAt: new Date(0).toISOString(),
};

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = req.session.userId;
  const user = userId ? await getPublicUser(userId) : undefined;

  req.user = user && user.isActive ? user : AUTH_DISABLED_USER;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to do this.' } });
      return;
    }
    next();
  };
}

import type { NextFunction, Request, Response } from 'express';
import { config } from '../config';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Session cookies are sent `SameSite=None` in production (required because the Vercel
// frontend and Render backend are different origins), which disables the browser's own
// SameSite CSRF defense. This replaces it with strict Origin/Referer validation: every
// state-changing request must present an Origin (or, failing that, a Referer) matching
// the one configured frontend origin, or it's rejected before touching a route handler.
// A same-site attacker page cannot forge this header — the browser sets it, not
// client-side script — so this holds even though the API never issues a CSRF token.
export function verifyOrigin(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  let source = origin;

  if (!source && req.headers.referer) {
    try {
      source = new URL(req.headers.referer).origin;
    } catch {
      source = undefined;
    }
  }

  if (!source || source !== config.clientOrigin) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Cross-site request blocked.' },
    });
    return;
  }

  next();
}

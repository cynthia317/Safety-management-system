import type { Request, Response } from 'express';
import * as myActionsService from './service';
import { hasOrgWideAccess } from '../auth/permissions';

/**
 * Identity is always the authenticated session's own name/workplace — there is no
 * `userId`/`recipient` query parameter here (unlike GET /api/notifications' Admin-only
 * override), because "My Actions" has no legitimate admin use case for viewing someone
 * else's assigned work; it's a personal worklist, not an audit surface.
 */
export async function getMyActionsHandler(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const result = await myActionsService.getMyActions({
    name: user.name,
    workplace: hasOrgWideAccess(user.role) ? undefined : { equals: user.workplace, mode: 'insensitive' },
  });
  res.json({ data: result });
}

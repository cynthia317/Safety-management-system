import type { Request, Response } from 'express';
import * as notificationService from './service';

// Notifications are keyed by recipient name (matching the `name` string used everywhere
// else in the app — see auth/service.ts), not a user id, so ownership is a name
// comparison. A normal user can only ever see/act on their own feed: the recipient is
// always derived from the authenticated session, never trusted from a client-supplied
// query/body value. Admin (organisation-wide access, same policy as workplace scoping —
// see auth/permissions.ts) may explicitly request another recipient's feed, since that's
// a legitimate, auditable administrative action rather than an unrestricted parameter.
function resolveRecipient(req: Request, requested: string | undefined): string {
  if (req.user!.role === 'Admin' && requested && requested.trim().length > 0) {
    return requested.trim();
  }
  return req.user!.name;
}

export async function listNotificationsHandler(req: Request, res: Response): Promise<void> {
  const requested = typeof req.query.recipient === 'string' ? req.query.recipient : undefined;
  const recipient = resolveRecipient(req, requested);
  res.json({ data: await notificationService.listNotifications(recipient) });
}

export async function markNotificationReadHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await notificationService.getNotificationById(id);

  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Notification "${id}" was not found.` } });
    return;
  }

  if (existing.recipient !== req.user!.name && req.user!.role !== 'Admin') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only mark your own notifications as read.' } });
    return;
  }

  const event = await notificationService.markNotificationRead(id);
  res.json({ data: event });
}

export async function markAllNotificationsReadHandler(req: Request, res: Response): Promise<void> {
  const requested = typeof req.body?.recipient === 'string' ? req.body.recipient : undefined;
  const recipient = resolveRecipient(req, requested);
  await notificationService.markAllNotificationsRead(recipient);
  res.json({ data: await notificationService.listNotifications(recipient) });
}

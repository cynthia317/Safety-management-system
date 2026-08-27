import type { Request, Response } from 'express';
import * as notificationService from './service';
import type { ListNotificationsFilter } from './service';

// A normal user's feed is always keyed off their own account id — never a client-supplied
// value. Admin (organisation-wide access, same policy as workplace scoping — see
// auth/permissions.ts) may explicitly request another recipient's feed by display name,
// since that's a legitimate, auditable administrative action; the name-based lookup is
// legacy (pre-Phase-3 rows have no recipientId) but still authoritative for it.
function resolveRecipientFilter(req: Request, requestedName: string | undefined): ListNotificationsFilter {
  if (req.user!.role === 'Admin' && requestedName && requestedName.trim().length > 0) {
    return { recipientName: requestedName.trim() };
  }
  return { recipientId: req.user!.id };
}

export async function listNotificationsHandler(req: Request, res: Response): Promise<void> {
  const requested = typeof req.query.recipient === 'string' ? req.query.recipient : undefined;
  const filter = resolveRecipientFilter(req, requested);
  res.json({ data: await notificationService.listNotifications(filter) });
}

export async function unreadCountHandler(req: Request, res: Response): Promise<void> {
  const requested = typeof req.query.recipient === 'string' ? req.query.recipient : undefined;
  const filter = resolveRecipientFilter(req, requested);
  res.json({ data: { count: await notificationService.countUnread(filter) } });
}

export async function markNotificationReadHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await notificationService.getNotificationById(id);

  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Notification "${id}" was not found.` } });
    return;
  }

  if (!notificationService.isNotificationOwner(existing, req.user!) && req.user!.role !== 'Admin') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only mark your own notifications as read.' } });
    return;
  }

  const event = await notificationService.markNotificationRead(id);
  res.json({ data: event });
}

export async function markAllNotificationsReadHandler(req: Request, res: Response): Promise<void> {
  const requested = typeof req.body?.recipient === 'string' ? req.body.recipient : undefined;
  const filter = resolveRecipientFilter(req, requested);
  await notificationService.markAllNotificationsRead(filter);
  res.json({ data: await notificationService.listNotifications(filter) });
}

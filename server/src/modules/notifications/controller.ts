import type { Request, Response } from 'express';
import * as notificationService from './service';

export async function listNotificationsHandler(req: Request, res: Response): Promise<void> {
  const recipient = typeof req.query.recipient === 'string' ? req.query.recipient : undefined;
  res.json({ data: await notificationService.listNotifications(recipient) });
}

export async function markNotificationReadHandler(req: Request, res: Response): Promise<void> {
  const event = await notificationService.markNotificationRead(req.params.id as string);

  if (!event) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Notification "${req.params.id}" was not found.` } });
    return;
  }

  res.json({ data: event });
}

export async function markAllNotificationsReadHandler(req: Request, res: Response): Promise<void> {
  const recipient = typeof req.body?.recipient === 'string' ? req.body.recipient : undefined;
  await notificationService.markAllNotificationsRead(recipient);
  res.json({ data: await notificationService.listNotifications(recipient) });
}

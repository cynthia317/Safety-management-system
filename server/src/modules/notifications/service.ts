import { prisma } from '../../lib/prisma';
import type { NotificationEvent as PrismaNotificationEvent } from '@prisma/client';
import type { NotificationEvent, NotificationEventType } from './types';

export interface QueueNotificationInput {
  type: NotificationEventType;
  recipient: string;
  subject: string;
  message: string;
  relatedEntityType: NotificationEvent['relatedEntityType'];
  relatedEntityId: string;
  relatedEntityReference: string;
}

function fromRow(row: PrismaNotificationEvent): NotificationEvent {
  return {
    id: row.id,
    type: row.type as NotificationEventType,
    recipient: row.recipient,
    subject: row.subject,
    message: row.message,
    relatedEntityType: row.relatedEntityType as NotificationEvent['relatedEntityType'],
    relatedEntityId: row.relatedEntityId,
    relatedEntityReference: row.relatedEntityReference,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

/**
 * Records a notification event for later delivery. No delivery channel (email/SMS/push) is
 * wired up yet — this only queues the event so a future delivery worker can pick it up,
 * mark `deliveredAt`, and dispatch it. Call sites are already in place at every trigger point
 * the spec calls for (assignment, verification request); due-date and overdue reminders need a
 * scheduler to invoke `queueNotification` periodically, which is not implemented here.
 */
export async function queueNotification(input: QueueNotificationInput): Promise<NotificationEvent> {
  const row = await prisma.notificationEvent.create({ data: input });
  return fromRow(row);
}

export async function listNotifications(recipient?: string): Promise<NotificationEvent[]> {
  const rows = await prisma.notificationEvent.findMany({
    where: recipient ? { recipient } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(fromRow);
}

export async function getNotificationById(id: string): Promise<NotificationEvent | undefined> {
  const row = await prisma.notificationEvent.findUnique({ where: { id } });
  return row ? fromRow(row) : undefined;
}

export async function markNotificationRead(id: string): Promise<NotificationEvent | undefined> {
  const existing = await prisma.notificationEvent.findUnique({ where: { id } });
  if (!existing) return undefined;

  const row = await prisma.notificationEvent.update({ where: { id }, data: { readAt: new Date() } });
  return fromRow(row);
}

export async function markAllNotificationsRead(recipient?: string): Promise<void> {
  await prisma.notificationEvent.updateMany({
    where: { ...(recipient ? { recipient } : {}), readAt: null },
    data: { readAt: new Date() },
  });
}

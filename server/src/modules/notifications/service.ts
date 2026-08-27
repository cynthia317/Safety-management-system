import { prisma } from '../../lib/prisma';
import type { NotificationEvent as PrismaNotificationEvent, Prisma } from '@prisma/client';
import type { NotificationEvent, NotificationEventType, NotificationPriority, NotificationRelatedEntityType } from './types';
import type { ResolvedRecipient } from './recipients';

export interface NotifyInput {
  type: NotificationEventType;
  subject: string;
  message: string;
  relatedEntityType: NotificationRelatedEntityType;
  relatedEntityId: string;
  relatedEntityReference: string;
  priority?: NotificationPriority;
}

function fromRow(row: PrismaNotificationEvent): NotificationEvent {
  return {
    id: row.id,
    type: row.type as NotificationEventType,
    recipient: row.recipient,
    recipientId: row.recipientId,
    workplace: row.workplace,
    priority: row.priority as NotificationPriority | null,
    subject: row.subject,
    message: row.message,
    relatedEntityType: row.relatedEntityType as NotificationRelatedEntityType,
    relatedEntityId: row.relatedEntityId,
    relatedEntityReference: row.relatedEntityReference,
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt ? row.deliveredAt.toISOString() : null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

/**
 * Creates a notification for a real, already-resolved User (see recipients.ts) — every
 * business workflow that wants to notify someone must resolve them to an actual account
 * first, rather than passing a role/name string through. No delivery channel (email/SMS/
 * push) is wired up yet; this only records the in-app event.
 */
export async function notifyUser(recipient: ResolvedRecipient, input: NotifyInput): Promise<NotificationEvent> {
  const row = await prisma.notificationEvent.create({
    data: {
      type: input.type,
      recipient: recipient.name,
      recipientId: recipient.id,
      workplace: recipient.workplace,
      priority: input.priority ?? null,
      subject: input.subject,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      relatedEntityReference: input.relatedEntityReference,
    },
  });
  return fromRow(row);
}

/**
 * Same as `notifyUser`, but for scheduled due-soon/overdue reminders: `reminderKey`
 * (`${type}:${relatedEntityId}:${recipientId}`) is unique in the database, so a repeated
 * scheduler run that finds the same record still in the same reminder state is a no-op
 * instead of creating a duplicate. Returns whether a new notification was actually created.
 */
export async function notifyUserOnce(
  recipient: ResolvedRecipient,
  input: NotifyInput,
  reminderKey: string,
): Promise<boolean> {
  const existing = await prisma.notificationEvent.findUnique({ where: { reminderKey } });
  if (existing) return false;

  try {
    await prisma.notificationEvent.create({
      data: {
        type: input.type,
        recipient: recipient.name,
        recipientId: recipient.id,
        workplace: recipient.workplace,
        priority: input.priority ?? null,
        subject: input.subject,
        message: input.message,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        relatedEntityReference: input.relatedEntityReference,
        reminderKey,
      },
    });
    return true;
  } catch (err) {
    // P2002 = unique constraint violation — a concurrent sweep already created this exact
    // reminder between the check above and this insert. Treat it the same as "already sent".
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'P2002') {
      return false;
    }
    throw err;
  }
}

export interface ListNotificationsFilter {
  recipientId?: string;
  /** Legacy name-based lookup — only used for the Admin "view another recipient's feed by
   * name" override, kept for backward compatibility with pre-Phase-3 rows. */
  recipientName?: string;
  limit?: number;
}

const DEFAULT_LIST_LIMIT = 50;

export async function listNotifications(filter: ListNotificationsFilter = {}): Promise<NotificationEvent[]> {
  const where: Prisma.NotificationEventWhereInput = {};
  if (filter.recipientId) where.recipientId = filter.recipientId;
  else if (filter.recipientName) where.recipient = filter.recipientName;

  const rows = await prisma.notificationEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filter.limit ?? DEFAULT_LIST_LIMIT,
  });
  return rows.map(fromRow);
}

export async function countUnread(filter: ListNotificationsFilter = {}): Promise<number> {
  const where: Prisma.NotificationEventWhereInput = { readAt: null };
  if (filter.recipientId) where.recipientId = filter.recipientId;
  else if (filter.recipientName) where.recipient = filter.recipientName;

  return prisma.notificationEvent.count({ where });
}

export async function getNotificationById(id: string): Promise<NotificationEvent | undefined> {
  const row = await prisma.notificationEvent.findUnique({ where: { id } });
  return row ? fromRow(row) : undefined;
}

/** A notification belongs to whoever `recipientId` names; pre-Phase-3 rows (created before
 * that column existed) have no recipientId, so ownership falls back to the display-name
 * snapshot for those only. */
export function isNotificationOwner(notification: NotificationEvent, user: { id: string; name: string }): boolean {
  if (notification.recipientId) return notification.recipientId === user.id;
  return notification.recipient === user.name;
}

export async function markNotificationRead(id: string): Promise<NotificationEvent | undefined> {
  const existing = await prisma.notificationEvent.findUnique({ where: { id } });
  if (!existing) return undefined;

  const row = await prisma.notificationEvent.update({ where: { id }, data: { readAt: new Date() } });
  return fromRow(row);
}

export async function markAllNotificationsRead(filter: ListNotificationsFilter = {}): Promise<void> {
  const where: Prisma.NotificationEventWhereInput = { readAt: null };
  if (filter.recipientId) where.recipientId = filter.recipientId;
  else if (filter.recipientName) where.recipient = filter.recipientName;

  await prisma.notificationEvent.updateMany({ where, data: { readAt: new Date() } });
}

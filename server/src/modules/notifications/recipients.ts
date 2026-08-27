import { prisma } from '../../lib/prisma';
import type { Role } from '../auth/types';

export interface ResolvedRecipient {
  id: string;
  name: string;
  workplace: string;
}

/**
 * Resolves a free-text name field (assignedTo, leadInspector, assessedBy, reportedBy, ...)
 * to a real, active User — scoped to the record's own workplace, since `User.name` is not
 * unique across the organisation and a same-named user at a different site must never
 * match. Returns undefined if nothing matches (e.g. a name typo, or the user was
 * deactivated) — callers skip the notification rather than invent a recipient.
 */
export async function resolveUserByName(name: string, workplace: string): Promise<ResolvedRecipient | undefined> {
  const trimmedName = name.trim();
  if (!trimmedName) return undefined;

  const row = await prisma.user.findFirst({
    where: {
      name: { equals: trimmedName, mode: 'insensitive' },
      workplace: { equals: workplace, mode: 'insensitive' },
      isActive: true,
    },
  });

  return row ? { id: row.id, name: row.name, workplace: row.workplace } : undefined;
}

/**
 * Replaces role-name-as-recipient logic (e.g. the old `recipient: 'EHS Officer'` literal)
 * with the actual active users holding one of the given roles at the given workplace, so a
 * notification always belongs to a real User record. May return zero, one, or several
 * users — callers create one notification per user returned.
 */
export async function resolveUsersByRole(workplace: string, roles: Role[]): Promise<ResolvedRecipient[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: { in: roles },
      workplace: { equals: workplace, mode: 'insensitive' },
      isActive: true,
    },
  });

  return rows.map((row) => ({ id: row.id, name: row.name, workplace: row.workplace }));
}

/** Case/whitespace-insensitive name comparison, used to skip notifying someone about their
 * own action (e.g. don't tell a user they assigned a hazard to themselves). */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Drops the actor from a recipient list (self-notification guard) and de-duplicates by
 * user id, so one person holding multiple qualifying roles doesn't get paged twice. */
export function excludeActor(recipients: ResolvedRecipient[], actorName: string): ResolvedRecipient[] {
  const seen = new Set<string>();
  const result: ResolvedRecipient[] = [];
  for (const recipient of recipients) {
    if (sameName(recipient.name, actorName)) continue;
    if (seen.has(recipient.id)) continue;
    seen.add(recipient.id);
    result.push(recipient);
  }
  return result;
}

import type { PaginationRequest } from './pagination';

// Risk/priority is stored as a plain string column (see schema.prisma's top-of-file note on
// why), so the database has no notion of "Critical > High > Medium > Low" — Prisma can't
// `orderBy` it correctly (alphabetical order doesn't match risk rank). Rather than reaching
// for raw SQL, callers fetch a narrow slice of columns (id + the fields needed to rank),
// sort that slice in memory, take just the requested page of ids, then hydrate full rows for
// only those ids — bounded by one filtered, index-friendly query rather than a full-table
// scan-and-loop.
export const RISK_RANK: Record<'Critical' | 'High' | 'Medium' | 'Low', number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export function sortAndPageByRank<T extends { id: string }>(
  rows: T[],
  rankOf: (row: T) => number,
  tiebreak: (a: T, b: T) => number,
  pagination?: PaginationRequest,
): { ids: string[]; total: number } {
  const sorted = [...rows].sort((a, b) => rankOf(a) - rankOf(b) || tiebreak(a, b));
  const total = sorted.length;
  const page = pagination ? sorted.slice(pagination.skip, pagination.skip + pagination.take) : sorted;
  return { ids: page.map((r) => r.id), total };
}

/** `findMany({ where: { id: { in: ids } } })` does not preserve the order of `ids` — this
 * restores it after hydrating full rows for the ranked/paged id slice above. */
export function reorderByIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is T => Boolean(r));
}

import { prisma } from './prisma';

/**
 * Atomically returns the next value for a named counter, creating it (from
 * `start`) on first use. A single upsert compiles to one `INSERT ... ON
 * CONFLICT DO UPDATE` statement, so this is safe under concurrent requests —
 * two callers can never be handed the same number.
 */
export async function nextCounterValue(name: string, start = 0): Promise<number> {
  const row = await prisma.counter.upsert({
    where: { name },
    create: { name, value: start + 1 },
    update: { value: { increment: 1 } },
  });
  return row.value;
}

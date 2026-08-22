import { PrismaClient } from '@prisma/client';

// Single shared client for the process. tsx watch re-executes this module on
// every file change in dev, so without the global cache each reload would
// open a fresh pool of Postgres connections and eventually exhaust the
// connection limit — the global stashes the instance across reloads.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

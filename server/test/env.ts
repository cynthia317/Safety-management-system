/**
 * Vitest `setupFiles` entry — runs once per test file/worker, guaranteed by Vitest to
 * complete BEFORE that context's test file (and therefore before test/helpers.ts's
 * `import { createApp } from '../src/app'`, and therefore before every one of the 15
 * controller/service modules that import src/lib/prisma.ts) is ever imported.
 *
 * Why this file, not a change to src/lib/prisma.ts: every one of those 15 modules
 * constructs its Prisma access through the single `prisma` singleton in
 * src/lib/prisma.ts, which — per schema.prisma's `datasource db { url = env("DATABASE_URL") }`
 * — resolves its connection from `process.env.DATABASE_URL` at the moment `new
 * PrismaClient()` first runs. There is no way to give that one singleton a different
 * datasource per-caller without either duplicating the Prisma Client (defeating the whole
 * point — controllers/services under test would still use the original, production-
 * connected client) or redirecting the single environment variable it reads, before it is
 * ever constructed. This file does the latter: it is the ONLY thing in this codebase
 * allowed to make src/lib/prisma.ts's singleton point somewhere other than the
 * production database, and it does so without any change to src/lib/prisma.ts itself.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { assertTestDatabaseIsolated } from './dbIsolation';

// Optional local override file (gitignored, like .env) — lets a developer configure
// TEST_DATABASE_URL without exporting it in their shell. Never overrides a value already
// present in process.env (e.g. one supplied by CI secrets), matching dotenv's own default
// behavior of not clobbering already-set variables.
const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
}

// Read the production DATABASE_URL directly from server/.env WITHOUT loading it into
// process.env — needed only for the equality guard below. Nothing here ever connects
// using this value.
const envPath = path.resolve(__dirname, '../.env');
let productionDatabaseUrl: string | undefined;
if (fs.existsSync(envPath)) {
  productionDatabaseUrl = dotenv.parse(fs.readFileSync(envPath)).DATABASE_URL;
}

// Fail closed, before any test file (or any module it imports) runs. A thrown error here
// aborts the entire Vitest run for this file/worker — no test executes, no database
// connection is ever attempted against anything.
assertTestDatabaseIsolated({ testUrl: process.env.TEST_DATABASE_URL, prodUrl: productionDatabaseUrl });

// Every application module under test resolves Prisma via this single environment
// variable — see the file header. Redirecting it here, this early, is what makes every
// controller/service/reminder-job/notification-service under test use the test database
// with zero changes to application code.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

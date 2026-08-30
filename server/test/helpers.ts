import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';
import { config } from '../src/config';
import * as authService from '../src/modules/auth/service';
import { prisma } from '../src/lib/prisma';
import type { Role } from '../src/modules/auth/types';

/**
 * These are integration tests against a real Postgres database (whatever `DATABASE_URL`
 * in server/.env points at) — there is no mock/in-memory Prisma layer in this codebase.
 * Every helper here namespaces the data it creates under TEST_RUN_PREFIX and every test
 * file cleans up exactly the rows it created in `afterAll`. Nothing here ever touches
 * pre-existing rows or runs a destructive whole-table operation.
 */
export const TEST_RUN_PREFIX = `__phase1_test_${Date.now().toString(36)}`;

export const TEST_PASSWORD = 'Test-password-123!';
export const ORIGIN = config.clientOrigin;

let emailCounter = 0;
export function testEmail(label: string): string {
  emailCounter += 1;
  return `${TEST_RUN_PREFIX}.${emailCounter}.${label}@example.invalid`.toLowerCase();
}

export function testWorkplaceName(label: string): string {
  return `${TEST_RUN_PREFIX} Workplace ${label}`;
}

export function buildApp(): Express {
  return createApp();
}

type Agent = ReturnType<typeof request.agent>;

/** Every mutating request must carry the configured frontend Origin, or the CSRF
 * middleware (server/src/middleware/csrf.ts) rejects it before it reaches a route. */
export function withOrigin(req: request.Test): request.Test {
  return req.set('Origin', ORIGIN);
}

export interface TestUser {
  agent: Agent;
  id: string;
  name: string;
  email: string;
  role: Role;
  workplace: string;
}

/** Creates a user directly via the service layer (bypassing the self-register
 * Admin restriction, so Admin fixtures can be created too) and logs it in through the
 * real HTTP login endpoint, so the returned agent's cookie jar holds a genuine session —
 * exercising the same authentication path a real client uses. */
export async function createAndLoginUser(
  app: Express,
  options: { name: string; role: Role; workplace: string; emailLabel: string },
): Promise<TestUser> {
  const email = testEmail(options.emailLabel);
  const user = await authService.createUser({
    name: options.name,
    email,
    password: TEST_PASSWORD,
    role: options.role,
    workplace: options.workplace,
  });

  const agent = request.agent(app);
  const res = await withOrigin(agent.post('/api/auth/login')).send({ email, password: TEST_PASSWORD });
  if (res.status !== 200) {
    throw new Error(`Test login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { agent, id: user.id, name: user.name, email: user.email, role: user.role, workplace: user.workplace };
}

/** Deletes every row this test run could plausibly have created, scoped to
 * TEST_RUN_PREFIX so it can never touch real data. Safe to call even if a given table
 * has nothing matching. */
export async function cleanupAllTestData(): Promise<void> {
  const emailLike = { contains: TEST_RUN_PREFIX };
  const workplaceLike = { contains: TEST_RUN_PREFIX };
  const nameLike = { contains: TEST_RUN_PREFIX };

  await prisma.correctiveAction.deleteMany({ where: { OR: [{ workplace: workplaceLike }, { title: nameLike }] } });
  await prisma.incident.deleteMany({ where: { OR: [{ workplace: workplaceLike }, { title: nameLike }] } });
  await prisma.hazardReport.deleteMany({ where: { OR: [{ workplace: workplaceLike }, { title: nameLike }] } });
  await prisma.finding.deleteMany({ where: { OR: [{ workplace: workplaceLike }, { title: nameLike }] } });
  await prisma.riskAssessment.deleteMany({ where: { OR: [{ workplace: workplaceLike }, { title: nameLike }] } });
  await prisma.inspection.deleteMany({ where: { OR: [{ workplace: workplaceLike }, { title: nameLike }] } });
  await prisma.inspectionTemplate.deleteMany({ where: { name: nameLike } });
  await prisma.workplace.deleteMany({ where: { name: nameLike } });
  await prisma.notificationEvent.deleteMany({ where: { recipient: nameLike } });
  await prisma.user.deleteMany({ where: { email: emailLike } });
}

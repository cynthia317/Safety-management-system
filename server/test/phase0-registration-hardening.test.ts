import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  buildApp,
  cleanupAllTestData,
  createAndLoginUser,
  testEmail,
  testWorkplaceName,
  withOrigin,
  TEST_PASSWORD,
  type TestUser,
} from './helpers';
import { prisma } from '../src/lib/prisma';
import type { Role } from '../src/modules/auth/types';

/**
 * Phase 0 — multi-organisation security hardening.
 *
 * Pre-existing live vulnerability: POST /api/auth/register was publicly accessible and let
 * an unauthenticated caller create an account and pick any non-Admin role plus any free-text
 * workplace — a direct account-creation path with no invitation, approval, or organisation
 * gatekeeping of any kind. Fixed by removing the route entirely (server/src/modules/auth/routes.ts)
 * rather than hiding it behind a 403 or client-side check, so a direct HTTP request has no
 * route to reach — this suite proves that, proves no equivalent anonymous path was left
 * reachable elsewhere, and proves every existing authenticated flow (login, session, Admin
 * usability) is completely unaffected.
 */
describe('Phase 0 — public self-registration removed', () => {
  let app: Express;
  const workplace = testWorkplaceName('P0');
  let existingAdmin: TestUser;

  beforeAll(async () => {
    app = buildApp();
    existingAdmin = await createAndLoginUser(app, { name: 'P0 Admin', role: 'Admin', workplace, emailLabel: 'p0admin' });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('1. Anonymous POST /api/auth/register cannot create a user', () => {
    it('returns 404 — the route no longer exists, not a 200/201', async () => {
      const email = testEmail('p0-anon');
      const res = await withOrigin(request(app).post('/api/auth/register')).send({
        name: 'Anonymous Attempt',
        email,
        password: TEST_PASSWORD,
        role: 'Worker',
        workplace,
      });

      expect(res.status).toBe(404);
      expect(await prisma.user.findFirst({ where: { email } })).toBeNull();
    });

    it('does not start a session for the attacker — no session cookie usable afterwards', async () => {
      const agent = request.agent(app);
      await withOrigin(agent.post('/api/auth/register')).send({
        name: 'Anonymous Attempt 2',
        email: testEmail('p0-anon-session'),
        password: TEST_PASSWORD,
        role: 'Worker',
        workplace,
      });

      const meRes = await agent.get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });
  });

  describe('2. Direct request manipulation cannot register any role', () => {
    const roles: Role[] = ['Worker', 'Supervisor', 'EHS Officer', 'Manager', 'Admin'];

    for (const role of roles) {
      it(`cannot create a ${role} account via POST /api/auth/register`, async () => {
        const email = testEmail(`p0-${role.replace(/\s+/g, '').toLowerCase()}`);
        const res = await withOrigin(request(app).post('/api/auth/register')).send({
          name: `Anonymous ${role}`,
          email,
          password: TEST_PASSWORD,
          role,
          workplace,
        });

        expect(res.status).toBe(404);
        expect(await prisma.user.findFirst({ where: { email } })).toBeNull();
      });
    }
  });

  describe('3-5. Existing accounts, login, and sessions are unaffected', () => {
    it('an existing account can still log in normally', async () => {
      const res = await withOrigin(request(app).post('/api/auth/login')).send({
        email: existingAdmin.email,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(existingAdmin.email);
    });

    it('an existing authenticated session still works (GET /api/auth/me)', async () => {
      const res = await withOrigin(existingAdmin.agent.get('/api/auth/me'));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(existingAdmin.id);
    });

    it('the existing Admin account remains fully usable — an Admin-only route still succeeds', async () => {
      const res = await withOrigin(existingAdmin.agent.get('/api/users'));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((u: { id: string }) => u.id === existingAdmin.id)).toBe(true);
    });
  });

  describe('6. Rejected registration attempts do not increase the user count', () => {
    it('the total user count is unchanged after several rejected attempts', async () => {
      const before = await prisma.user.count();

      for (let i = 0; i < 3; i += 1) {
        await withOrigin(request(app).post('/api/auth/register')).send({
          name: 'Spam Attempt',
          email: testEmail(`p0-spam-${i}`),
          password: TEST_PASSWORD,
          role: 'Worker',
          workplace,
        });
      }

      const after = await prisma.user.count();
      expect(after).toBe(before);
    });
  });

  describe('7. No anonymous alternative user-creation/management endpoint exists', () => {
    it('the users directory has no anonymous read or write path', async () => {
      // usersRouter (server/src/modules/auth/routes.ts) exposes no POST route at all — only
      // GET '/' (list), GET '/assignable', and PATCH '/:id' (update an EXISTING user), every
      // one of them behind requireAuth. There is no route anywhere that lets an
      // unauthenticated caller create a user, and none of these three let one modify a
      // user's role/workplace/active status either.
      const listRes = await request(app).get('/api/users');
      expect(listRes.status).toBe(401);

      const assignableRes = await request(app).get('/api/users/assignable');
      expect(assignableRes.status).toBe(401);

      const patchRes = await withOrigin(request(app).patch(`/api/users/${existingAdmin.id}`)).send({ role: 'Admin' });
      expect(patchRes.status).toBe(401);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: existingAdmin.id } })).role).toBe('Admin');
    });

    it('PATCH /api/auth/me (self profile update) cannot be used to self-elevate without a session', async () => {
      const res = await withOrigin(request(app).patch('/api/auth/me')).send({ role: 'Admin', workplace: 'Anywhere' });
      expect(res.status).toBe(401);
    });

    it('every other domain router requires authentication — spot-check a representative sample', async () => {
      // Confirms Phase 0 didn't accidentally leave (or this audit didn't miss) a second
      // unauthenticated router mounted in app.ts alongside the now-removed register route.
      const hazards = await request(app).get('/api/hazards');
      expect(hazards.status).toBe(401);

      const workplaces = await request(app).get('/api/workplaces');
      expect(workplaces.status).toBe(401);
    });
  });
});

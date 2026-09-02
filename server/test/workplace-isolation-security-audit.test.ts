import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { buildApp, cleanupAllTestData, createAndLoginUser, testWorkplaceName, withOrigin, type TestUser } from './helpers';

/**
 * Pilot HIGH PRIORITY finding: "A Worker appears able to SEE OTHER WORKPLACES."
 *
 * Investigation traced this to two independent defects, neither previously covered by a
 * regression test:
 *
 *   1. CRITICAL — `PATCH /api/auth/me` (self profile update) accepted a client-supplied
 *      `workplace` value from ANY authenticated role, with no check that the caller is
 *      Admin. Since `requireAuth` re-reads the user fresh from the DB on every request
 *      (server/src/modules/auth/middleware.ts) and every workplace-scoping check in the
 *      app (workplaceScopeWhere/canAccessRecordWorkplace) trusts `req.user.workplace` as
 *      ground truth, a Worker could rewrite their own account's workplace to any other
 *      site and immediately gain full read/write access to that site's Hazards,
 *      Incidents, Inspections, Findings, Corrective Actions, Risk Assessments, My Actions,
 *      and Dashboard — a full authorization bypass, not merely an information leak. Fixed
 *      by dropping a non-Admin's client-supplied `workplace` in updateProfileHandler
 *      (server/src/modules/auth/controller.ts); Admin's own self-edit is unaffected.
 *
 *   2. MEDIUM — `GET /api/workplaces` and `GET /api/workplaces/:id` (the workplace
 *      directory: name, code, industry, address, area/location structure, activity log)
 *      returned every workplace in the organisation to every authenticated role, with no
 *      scoping at all — consumed by the unguarded `/workplaces` and `/workplaces/:id`
 *      client routes and by the workplace-filter dropdown on every list page (Hazards,
 *      Incidents, Inspections, Findings, Corrective Actions). Fixed by scoping both
 *      endpoints to the caller's own workplace for every non-Admin role, the same
 *      principle already applied to every domain record
 *      (server/src/modules/workplaces/controller.ts).
 *
 * Every other module already enforced workplace scoping correctly before this audit (see
 * workplace-scoping.test.ts, hazard-worker-scoping.test.ts) — these two were the actual
 * root cause of the live observation, not a gap in Hazard-specific logic.
 */
describe('Pilot HIGH PRIORITY — Worker cross-workplace visibility: root cause + fix', () => {
  let app: Express;
  const siteA = testWorkplaceName('IsoAuditA');
  const siteB = testWorkplaceName('IsoAuditB');

  let admin: TestUser;
  let workerA: TestUser;
  let supervisorA: TestUser;
  let ehsB: TestUser;
  let managerA: TestUser;

  let workplaceAId: string;
  let workplaceBId: string;

  beforeAll(async () => {
    app = buildApp();
    admin = await createAndLoginUser(app, { name: 'Iso Admin', role: 'Admin', workplace: siteA, emailLabel: 'iso-admin' });
    workerA = await createAndLoginUser(app, { name: 'Iso Worker A', role: 'Worker', workplace: siteA, emailLabel: 'iso-workera' });
    supervisorA = await createAndLoginUser(app, {
      name: 'Iso Supervisor A',
      role: 'Supervisor',
      workplace: siteA,
      emailLabel: 'iso-supervisora',
    });
    ehsB = await createAndLoginUser(app, { name: 'Iso EHS B', role: 'EHS Officer', workplace: siteB, emailLabel: 'iso-ehsb' });
    managerA = await createAndLoginUser(app, { name: 'Iso Manager A', role: 'Manager', workplace: siteA, emailLabel: 'iso-managera' });

    async function createDirectoryEntry(name: string) {
      const res = await withOrigin(admin.agent.post('/api/workplaces')).send({
        organisation: 'Isolation Audit Org',
        name,
        code: `ISO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        industry: 'Manufacturing',
        address: '1 Test Way',
        areas: [],
      });
      expect(res.status).toBe(201);
      return res.body.data.id as string;
    }
    workplaceAId = await createDirectoryEntry(siteA);
    workplaceBId = await createDirectoryEntry(siteB);

    // A Site A Hazard exists so we can prove a self-reassigned account gains *actual* data
    // access, not merely a changed profile field.
    const hazardRes = await withOrigin(workerA.agent.post('/api/hazards')).send({
      title: `${siteA} isolation-audit hazard`,
      description: 'Hazard used to verify workplace self-reassignment cannot grant cross-site access.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace: siteA,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: workerA.name,
    });
    expect(hazardRes.status).toBe(201);

    const hazardBRes = await withOrigin(ehsB.agent.post('/api/hazards')).send({
      title: `${siteB} isolation-audit hazard`,
      description: 'Site B hazard a Site A Worker must never be able to reach.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace: siteB,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: ehsB.name,
    });
    expect(hazardBRes.status).toBe(201);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('1. Self-service workplace reassignment (critical)', () => {
    it('a Worker cannot change their own workplace via PATCH /api/auth/me — the value is silently ignored, not applied', async () => {
      const res = await withOrigin(workerA.agent.patch('/api/auth/me')).send({ workplace: siteB });
      expect(res.status).toBe(200);
      expect(res.body.data.workplace).toBe(siteA);
      expect(res.body.data.workplace).not.toBe(siteB);
    });

    it('the reassignment attempt has no effect on the next request — the Worker still cannot see Site B data', async () => {
      await withOrigin(workerA.agent.patch('/api/auth/me')).send({ workplace: siteB });

      const meRes = await withOrigin(workerA.agent.get('/api/auth/me'));
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.workplace).toBe(siteA);

      const listRes = await withOrigin(workerA.agent.get('/api/hazards'));
      expect(listRes.status).toBe(200);
      const titles = listRes.body.data.map((h: { title: string }) => h.title);
      expect(titles).not.toContain(`${siteB} isolation-audit hazard`);
      expect(titles.every((t: string) => !t.startsWith(siteB))).toBe(true);
    });

    it('a Supervisor (any non-Admin role, not just Worker) is equally blocked from self-reassignment', async () => {
      const res = await withOrigin(supervisorA.agent.patch('/api/auth/me')).send({ workplace: siteB });
      expect(res.status).toBe(200);
      expect(res.body.data.workplace).toBe(siteA);
    });

    it('a Worker can still update their own name through the same endpoint — the fix does not break legitimate profile edits', async () => {
      const res = await withOrigin(workerA.agent.patch('/api/auth/me')).send({ name: 'Iso Worker A Renamed', workplace: siteB });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Iso Worker A Renamed');
      expect(res.body.data.workplace).toBe(siteA);

      // Restore, so later tests/assertions relying on the original name are unaffected.
      await withOrigin(workerA.agent.patch('/api/auth/me')).send({ name: workerA.name });
    });

    it('Admin retains the ability to change their own workplace through self-profile update — no regression', async () => {
      const res = await withOrigin(admin.agent.patch('/api/auth/me')).send({ workplace: siteB });
      expect(res.status).toBe(200);
      expect(res.body.data.workplace).toBe(siteB);

      // Restore — Admin's own workplace is irrelevant to its org-wide access, but keep the
      // fixture stable for the rest of the suite.
      await withOrigin(admin.agent.patch('/api/auth/me')).send({ workplace: siteA });
    });
  });

  describe('2. Workplace directory scoping', () => {
    it('a Worker listing GET /api/workplaces sees only their own workplace, not the full organisation directory', async () => {
      const res = await withOrigin(workerA.agent.get('/api/workplaces'));
      expect(res.status).toBe(200);
      const names = (res.body.data as { name: string }[]).map((w) => w.name);
      expect(names).toContain(siteA);
      expect(names).not.toContain(siteB);
    });

    it('a Worker can fetch their own workplace directory entry by id', async () => {
      const res = await withOrigin(workerA.agent.get(`/api/workplaces/${workplaceAId}`));
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(siteA);
    });

    it("a Worker cannot fetch another workplace's directory entry by id, even with the correct id", async () => {
      const res = await withOrigin(workerA.agent.get(`/api/workplaces/${workplaceBId}`));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Admin still sees the full organisation-wide workplace directory — no regression', async () => {
      const listRes = await withOrigin(admin.agent.get('/api/workplaces'));
      expect(listRes.status).toBe(200);
      const names = (listRes.body.data as { name: string }[]).map((w) => w.name);
      expect(names).toContain(siteA);
      expect(names).toContain(siteB);

      const getRes = await withOrigin(admin.agent.get(`/api/workplaces/${workplaceBId}`));
      expect(getRes.status).toBe(200);
    });
  });

  // Backend enforcement of workplace creation, independent of the frontend "New Workplace"
  // button being hidden for non-Admin roles (client/src/pages/WorkplaceListPage.tsx) — a
  // direct API call must be rejected regardless of what the UI shows. canManageWorkplaces
  // (server/src/modules/auth/permissions.ts) already restricted this to Admin before this
  // audit; these cases just make that coverage explicit for every non-Admin role, not only
  // Worker/EHS Officer (see phase5.test.ts and authorization.test.ts for the pre-existing
  // Worker/EHS Officer/Admin cases).
  describe('3. Workplace creation is Admin-only, enforced server-side', () => {
    function createPayload(name: string) {
      return {
        organisation: 'Isolation Audit Org',
        name,
        code: `ISO-CREATE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        industry: 'Manufacturing',
        address: '1 Test Way',
        areas: [],
      };
    }

    it('a Worker cannot create a workplace', async () => {
      const res = await withOrigin(workerA.agent.post('/api/workplaces')).send(createPayload(testWorkplaceName('IsoCreateWorker')));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('a Supervisor cannot create a workplace', async () => {
      const res = await withOrigin(supervisorA.agent.post('/api/workplaces')).send(
        createPayload(testWorkplaceName('IsoCreateSupervisor')),
      );
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('an EHS Officer cannot create a workplace', async () => {
      const res = await withOrigin(ehsB.agent.post('/api/workplaces')).send(createPayload(testWorkplaceName('IsoCreateEHS')));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('a Manager cannot create a workplace', async () => {
      const res = await withOrigin(managerA.agent.post('/api/workplaces')).send(
        createPayload(testWorkplaceName('IsoCreateManager')),
      );
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('an Admin can create a workplace', async () => {
      const res = await withOrigin(admin.agent.post('/api/workplaces')).send(createPayload(testWorkplaceName('IsoCreateAdmin')));
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(testWorkplaceName('IsoCreateAdmin'));
    });
  });
});

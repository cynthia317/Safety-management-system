import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import {
  buildApp,
  cleanupAllTestData,
  createAndLoginUser,
  testWorkplaceName,
  withOrigin,
  type TestUser,
} from './helpers';

describe('Phase 4 — dashboard, pagination, my actions', () => {
  let app: Express;
  const siteA = testWorkplaceName('P4SiteA');
  const siteB = testWorkplaceName('P4SiteB');

  let userA: TestUser;
  let userB: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    app = buildApp();
    userA = await createAndLoginUser(app, { name: 'P4 User A', role: 'EHS Officer', workplace: siteA, emailLabel: 'usera' });
    userB = await createAndLoginUser(app, { name: 'P4 User B', role: 'EHS Officer', workplace: siteB, emailLabel: 'userb' });
    admin = await createAndLoginUser(app, { name: 'P4 Admin', role: 'Admin', workplace: siteA, emailLabel: 'admin' });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  async function createHazard(
    creator: TestUser,
    overrides: Partial<{ title: string; workplace: string; riskLevel: string; assignedTo: string }> = {},
  ) {
    const res = await withOrigin(creator.agent.post('/api/hazards')).send({
      title: overrides.title ?? `${creator.workplace} hazard`,
      description: 'Phase 4 test hazard.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace: overrides.workplace ?? creator.workplace,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: overrides.riskLevel ?? 'Medium',
      reportedBy: creator.name,
      assignedTo: overrides.assignedTo ?? creator.name,
    });
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function createCorrectiveAction(
    creator: TestUser,
    overrides: Partial<{ title: string; workplace: string; priority: string; assignedTo: string; dueDate: string; status: string }> = {},
  ) {
    const res = await withOrigin(creator.agent.post('/api/corrective-actions')).send({
      title: overrides.title ?? `${creator.workplace} CA`,
      description: 'Phase 4 test corrective action.',
      workplace: overrides.workplace ?? creator.workplace,
      department: 'Test dept',
      location: 'Test location',
      priority: overrides.priority ?? 'Medium',
      assignedTo: overrides.assignedTo ?? creator.name,
      dueDate: overrides.dueDate ?? '2099-01-01',
      createdBy: creator.name,
      // Verifying requires at least one evidence file (see correctiveActions/controller.ts)
      // — attached unconditionally so `overrides.status: 'Verified'` below always succeeds.
      evidence: [{ fileName: 'evidence.png', fileSize: 5, mimeType: 'image/png', dataUrl: 'data:image/png;base64,aGVsbG8=' }],
    });
    expect(res.status).toBe(201);
    const action = res.body.data;

    if (overrides.status) {
      const update = await withOrigin(creator.agent.patch(`/api/corrective-actions/${action.id}`)).send({
        status: overrides.status,
        actor: creator.name,
      });
      expect(update.status).toBe(200);
      return update.body.data;
    }
    return action;
  }

  describe('Dashboard summary', () => {
    let hazardAtA: { id: string };
    let hazardAtB: { id: string };

    beforeAll(async () => {
      hazardAtA = await createHazard(userA, { riskLevel: 'Critical' });
      hazardAtB = await createHazard(userB, { riskLevel: 'Critical' });
    });

    it("scopes counts to the caller's own workplace and excludes other sites", async () => {
      const resA = await withOrigin(userA.agent.get('/api/dashboard/summary'));
      expect(resA.status).toBe(200);
      const summaryA = resA.body.data;

      expect(summaryA.openHazards).toBeGreaterThanOrEqual(1);
      expect(summaryA.recentHazards.every((h: { workplace: string }) => h.workplace === siteA)).toBe(true);
      expect(summaryA.recentHazards.some((h: { id: string }) => h.id === hazardAtB.id)).toBe(false);
    });

    it('gives Admin organisation-wide visibility across both sites', async () => {
      const res = await withOrigin(admin.agent.get('/api/dashboard/summary'));
      expect(res.status).toBe(200);
      // Both fixtures were just created, so — barring 5+ even-more-recent hazards
      // elsewhere in the database — they're both within Admin's top-5 "recent" window.
      const ids = res.body.data.recentHazards.map((h: { id: string }) => h.id);
      expect(ids).toContain(hazardAtA.id);
      expect(ids).toContain(hazardAtB.id);
    });
  });

  describe('Pagination', () => {
    const paginationWorkplace = testWorkplaceName('P4Pagination');
    let paginationUser: TestUser;

    beforeAll(async () => {
      paginationUser = await createAndLoginUser(app, {
        name: 'P4 Pagination User',
        role: 'EHS Officer',
        workplace: paginationWorkplace,
        emailLabel: 'pagination',
      });
      for (let i = 0; i < 5; i += 1) {
        await createHazard(paginationUser, { title: `${paginationWorkplace} hazard ${i}` });
      }
    });

    it('returns distinct records and correct totals across pages', async () => {
      const page1 = await withOrigin(paginationUser.agent.get('/api/hazards?page=1&pageSize=2'));
      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.meta).toEqual({ page: 1, pageSize: 2, total: 5, totalPages: 3 });

      const page2 = await withOrigin(paginationUser.agent.get('/api/hazards?page=2&pageSize=2'));
      expect(page2.status).toBe(200);
      expect(page2.body.data).toHaveLength(2);
      expect(page2.body.meta.page).toBe(2);

      const page1Ids = page1.body.data.map((h: { id: string }) => h.id);
      const page2Ids = page2.body.data.map((h: { id: string }) => h.id);
      expect(page1Ids.some((id: string) => page2Ids.includes(id))).toBe(false);
    });

    it('applies filters and pagination together', async () => {
      await createHazard(paginationUser, { title: `${paginationWorkplace} critical hazard`, riskLevel: 'Critical' });

      const res = await withOrigin(paginationUser.agent.get('/api/hazards?riskLevel=Critical&page=1&pageSize=10'));
      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.data.every((h: { riskLevel: string }) => h.riskLevel === 'Critical')).toBe(true);
    });

    it('still enforces workplace scoping when paginated', async () => {
      const res = await withOrigin(userB.agent.get('/api/hazards?page=1&pageSize=50'));
      expect(res.status).toBe(200);
      expect(res.body.data.every((h: { workplace: string }) => h.workplace === siteB)).toBe(true);
    });
  });

  describe('My Actions', () => {
    it("shows only the authenticated user's own assigned work, derived from the session", async () => {
      const forA = await createCorrectiveAction(userA, { title: `${siteA} CA for user A`, assignedTo: userA.name });
      await createCorrectiveAction(userB, { title: `${siteB} CA for user B`, assignedTo: userB.name });

      const resA = await withOrigin(userA.agent.get('/api/my-actions'));
      expect(resA.status).toBe(200);
      expect(resA.body.data.items.some((i: { id: string }) => i.id === forA.id)).toBe(true);

      const resB = await withOrigin(userB.agent.get('/api/my-actions'));
      expect(resB.status).toBe(200);
      expect(resB.body.data.items.some((i: { id: string }) => i.id === forA.id)).toBe(false);
    });

    it('marks a past-due, still-open item as overdue and correctly maps its module/route', async () => {
      const overdue = await createCorrectiveAction(userA, {
        title: `${siteA} overdue CA`,
        assignedTo: userA.name,
        dueDate: '2020-01-01',
      });

      const res = await withOrigin(userA.agent.get('/api/my-actions'));
      const item = res.body.data.items.find((i: { id: string }) => i.id === overdue.id);
      expect(item).toBeTruthy();
      expect(item.overdue).toBe(true);
      expect(item.module).toBe('corrective_action');
      expect(item.route).toBe(`/corrective-actions/${overdue.id}`);
    });

    it('does not count a closed item as active or overdue', async () => {
      const closed = await createCorrectiveAction(userA, {
        title: `${siteA} closed CA`,
        assignedTo: userA.name,
        dueDate: '2020-01-01',
        status: 'Verified',
      });
      const finalClose = await withOrigin(userA.agent.patch(`/api/corrective-actions/${closed.id}`)).send({
        status: 'Closed',
        actor: userA.name,
      });
      expect(finalClose.status).toBe(200);

      const res = await withOrigin(userA.agent.get('/api/my-actions'));
      const item = res.body.data.items.find((i: { id: string }) => i.id === closed.id);
      expect(item).toBeTruthy();
      expect(item.overdue).toBe(false);
      expect(item.active).toBe(false);
    });

    it('resolves a same-named user at a different workplace to a distinct identity (no cross-site leakage)', async () => {
      const forA = await createCorrectiveAction(userA, { title: `${siteA} CA for name-collision check`, assignedTo: userA.name });

      const sameNameOtherSite = await createAndLoginUser(app, {
        name: 'P4 User A',
        role: 'EHS Officer',
        workplace: siteB,
        emailLabel: 'samename',
      });

      const res = await withOrigin(sameNameOtherSite.agent.get('/api/my-actions'));
      expect(res.status).toBe(200);
      // Same display name as userA, but a different account at a different workplace —
      // must never see userA's Site-A-scoped work (the same collision Phase 3 closed for
      // notification recipients).
      const items = res.body.data.items as { id: string; workplace: string }[];
      expect(items.some((i) => i.id === forA.id)).toBe(false);
      expect(items.every((i) => i.workplace === siteB)).toBe(true);
    });
  });
});

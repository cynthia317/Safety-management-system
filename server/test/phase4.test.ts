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

    it('Critical Hazards count matches exactly what its deep-linked hazards list returns', async () => {
      const critical = await createHazard(userA, {
        title: `${siteA} critical hazard for dashboard deep-link match`,
        riskLevel: 'Critical',
      });

      const dashboardRes = await withOrigin(userA.agent.get('/api/dashboard/summary'));
      expect(dashboardRes.status).toBe(200);
      const count = dashboardRes.body.data.criticalHazards;
      expect(count).toBeGreaterThanOrEqual(1);

      const listRes = await withOrigin(userA.agent.get('/api/hazards?openOnly=true&riskLevel=Critical&pageSize=100'));
      expect(listRes.status).toBe(200);
      // The card's count and the population behind its link must be the exact same set —
      // not just "both non-zero" — proving the deep link isn't a different filter in disguise.
      expect(listRes.body.meta.total).toBe(count);
      expect(listRes.body.data.some((h: { id: string }) => h.id === critical.id)).toBe(true);
      expect(listRes.body.data.every((h: { workplace: string }) => h.workplace === siteA)).toBe(true);
    });

    async function createActiveTemplateFor(user: TestUser) {
      const templateRes = await withOrigin(user.agent.post('/api/inspection-templates')).send({
        name: `${user.workplace} dashboard-deep-link template`,
        code: `T4-DASH-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        category: 'General Workplace Safety',
        sections: [{ title: 'Section A', questions: [{ text: 'Is it safe?', responseType: 'compliance', required: false }] }],
      });
      expect(templateRes.status).toBe(201);
      const activateRes = await withOrigin(user.agent.patch(`/api/inspection-templates/${templateRes.body.data.id}`)).send({
        status: 'Active',
      });
      expect(activateRes.status).toBe(200);
      return templateRes.body.data;
    }

    it('Inspections This Month count matches exactly what its deep-linked, date-filtered list returns', async () => {
      const template = await createActiveTemplateFor(userA);
      const inspectionRes = await withOrigin(userA.agent.post('/api/inspections')).send({
        templateId: template.id,
        title: `${siteA} inspection scheduled this month`,
        workplace: siteA,
        area: 'Test area',
        specificLocation: 'Test location',
        inspectionDate: new Date().toISOString(),
        leadInspector: userA.name,
      });
      expect(inspectionRes.status).toBe(201);

      const dashboardRes = await withOrigin(userA.agent.get('/api/dashboard/summary'));
      expect(dashboardRes.status).toBe(200);
      const { inspectionsThisMonth, thisMonthStart, thisMonthEnd } = dashboardRes.body.data;
      expect(inspectionsThisMonth).toBeGreaterThanOrEqual(1);

      const listRes = await withOrigin(
        userA.agent.get(
          `/api/inspections?from=${encodeURIComponent(thisMonthStart)}&to=${encodeURIComponent(thisMonthEnd)}&pageSize=100`,
        ),
      );
      expect(listRes.status).toBe(200);
      expect(listRes.body.meta.total).toBe(inspectionsThisMonth);
      expect(listRes.body.data.some((i: { id: string }) => i.id === inspectionRes.body.data.id)).toBe(true);

      // A date outside this month must exclude the fixture — proves the filter is a real
      // boundary, not a no-op that happens to return everything.
      const nextMonthStart = new Date(thisMonthEnd);
      const nextMonthEnd = new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth() + 1, 1);
      const outsideRes = await withOrigin(
        userA.agent.get(
          `/api/inspections?from=${encodeURIComponent(nextMonthStart.toISOString())}&to=${encodeURIComponent(nextMonthEnd.toISOString())}`,
        ),
      );
      expect(outsideRes.status).toBe(200);
      expect(outsideRes.body.data.some((i: { id: string }) => i.id === inspectionRes.body.data.id)).toBe(false);
    });

    it('paginates correctly when combined with the this-month date filter', async () => {
      const template = await createActiveTemplateFor(userA);
      for (let i = 0; i < 3; i += 1) {
        const res = await withOrigin(userA.agent.post('/api/inspections')).send({
          templateId: template.id,
          title: `${siteA} paginated this-month inspection ${i}`,
          workplace: siteA,
          area: 'Test area',
          specificLocation: 'Test location',
          inspectionDate: new Date().toISOString(),
          leadInspector: userA.name,
        });
        expect(res.status).toBe(201);
      }

      const dashboardRes = await withOrigin(userA.agent.get('/api/dashboard/summary'));
      const { thisMonthStart, thisMonthEnd } = dashboardRes.body.data;

      const page1 = await withOrigin(
        userA.agent.get(
          `/api/inspections?from=${encodeURIComponent(thisMonthStart)}&to=${encodeURIComponent(thisMonthEnd)}&page=1&pageSize=2`,
        ),
      );
      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.meta.total).toBeGreaterThanOrEqual(4);
    }, 60000);
  });

  describe('Closure rate', () => {
    const closureWorkplace = testWorkplaceName('P4Closure');
    const closureOtherWorkplace = testWorkplaceName('P4ClosureOther');
    const closureEmptyWorkplace = testWorkplaceName('P4ClosureEmpty');
    let closureUser: TestUser;
    let closureOtherUser: TestUser;
    let closureEmptyUser: TestUser;

    beforeAll(async () => {
      closureUser = await createAndLoginUser(app, {
        name: 'P4 Closure User',
        role: 'EHS Officer',
        workplace: closureWorkplace,
        emailLabel: 'closure',
      });
      closureOtherUser = await createAndLoginUser(app, {
        name: 'P4 Closure Other',
        role: 'EHS Officer',
        workplace: closureOtherWorkplace,
        emailLabel: 'closureother',
      });
      closureEmptyUser = await createAndLoginUser(app, {
        name: 'P4 Closure Empty',
        role: 'EHS Officer',
        workplace: closureEmptyWorkplace,
        emailLabel: 'closureempty',
      });
    });

    it('computes closure rate as closed/total for the caller\'s own workplace only', async () => {
      // 1 closed out of 4 at closureWorkplace -> 25.0%.
      await createCorrectiveAction(closureUser, { title: `${closureWorkplace} CA closure 1` });
      await createCorrectiveAction(closureUser, { title: `${closureWorkplace} CA closure 2` });
      await createCorrectiveAction(closureUser, { title: `${closureWorkplace} CA closure 3` });
      await createCorrectiveAction(closureUser, { title: `${closureWorkplace} CA closure 4`, status: 'Closed' });

      // All closed at closureOtherWorkplace -> 100%, and must not affect closureUser's rate.
      await createCorrectiveAction(closureOtherUser, { title: `${closureOtherWorkplace} CA other 1`, status: 'Closed' });

      const res = await withOrigin(closureUser.agent.get('/api/dashboard/summary'));
      expect(res.status).toBe(200);
      expect(res.body.data.closureRate).toBe(25);

      const otherRes = await withOrigin(closureOtherUser.agent.get('/api/dashboard/summary'));
      expect(otherRes.status).toBe(200);
      expect(otherRes.body.data.closureRate).toBe(100);
      // 5 sequential corrective-action creates (each with its own evidence/notification
      // round trips) plus 2 summary fetches against the real test database — same class
      // of sequential-HTTP-overhead timeout as the templateId pagination test above.
    }, 60000);

    it('returns 0 rather than NaN when the workplace has no corrective actions at all', async () => {
      const res = await withOrigin(closureEmptyUser.agent.get('/api/dashboard/summary'));
      expect(res.status).toBe(200);
      expect(res.body.data.closureRate).toBe(0);
      expect(Number.isNaN(res.body.data.closureRate)).toBe(false);
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

  describe('Inspection template & inspector filtering', () => {
    const filterWorkplace = testWorkplaceName('P4InspFilterA');
    const otherWorkplace = testWorkplaceName('P4InspFilterB');
    let filterUser: TestUser;
    let otherWorkplaceUser: TestUser;
    let templateA: { id: string };
    let templateB: { id: string };

    beforeAll(async () => {
      filterUser = await createAndLoginUser(app, {
        name: 'P4 Filter User',
        role: 'EHS Officer',
        workplace: filterWorkplace,
        emailLabel: 'inspfiltera',
      });
      otherWorkplaceUser = await createAndLoginUser(app, {
        name: 'P4 Filter Other',
        role: 'EHS Officer',
        workplace: otherWorkplace,
        emailLabel: 'inspfilterb',
      });
      templateA = await createActiveTemplate(filterUser, 'Template A');
      templateB = await createActiveTemplate(filterUser, 'Template B');
    });

    async function createActiveTemplate(creator: TestUser, label: string) {
      const templateRes = await withOrigin(creator.agent.post('/api/inspection-templates')).send({
        name: `${creator.workplace} ${label}`,
        code: `T4-${label.replace(/\s+/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        category: 'General Workplace Safety',
        sections: [{ title: 'Section A', questions: [{ text: 'Is it safe?', responseType: 'compliance', required: false }] }],
      });
      expect(templateRes.status).toBe(201);
      const activateRes = await withOrigin(creator.agent.patch(`/api/inspection-templates/${templateRes.body.data.id}`)).send({
        status: 'Active',
      });
      expect(activateRes.status).toBe(200);
      return templateRes.body.data;
    }

    async function createInspectionRecord(
      creator: TestUser,
      overrides: Partial<{ title: string; workplace: string; templateId: string; leadInspector: string }> = {},
    ) {
      const res = await withOrigin(creator.agent.post('/api/inspections')).send({
        templateId: overrides.templateId ?? templateA.id,
        title: overrides.title ?? `${creator.workplace} inspection`,
        workplace: overrides.workplace ?? creator.workplace,
        area: 'Test area',
        specificLocation: 'Test location',
        inspectionDate: '2026-08-20',
        leadInspector: overrides.leadInspector ?? creator.name,
      });
      expect(res.status).toBe(201);
      return res.body.data;
    }

    it('filters by templateId across the full dataset, not just the current page', async () => {
      // Creates 7 inspections plus 4 list requests sequentially against the real test
      // database — comfortably over the default 30s timeout under this suite's per-request latency.
      const templateAInspections = [];
      for (let i = 0; i < 5; i += 1) {
        templateAInspections.push(
          await createInspectionRecord(filterUser, {
            title: `${filterWorkplace} tplA insp ${i}`,
            templateId: templateA.id,
            leadInspector: `Inspector A${i}`,
          }),
        );
      }
      for (let i = 0; i < 2; i += 1) {
        await createInspectionRecord(filterUser, {
          title: `${filterWorkplace} tplB insp ${i}`,
          templateId: templateB.id,
          leadInspector: `Inspector B${i}`,
        });
      }

      const page1 = await withOrigin(filterUser.agent.get(`/api/inspections?templateId=${templateA.id}&page=1&pageSize=2`));
      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.data.every((i: { templateId: string }) => i.templateId === templateA.id)).toBe(true);
      // If filtering ran only over the 2-row page (the pre-fix bug), this would reflect the
      // unfiltered page total instead of the true count of templateA rows across the whole dataset.
      expect(page1.body.meta.total).toBe(5);
      expect(page1.body.meta.totalPages).toBe(3);

      const page2 = await withOrigin(filterUser.agent.get(`/api/inspections?templateId=${templateA.id}&page=2&pageSize=2`));
      const page3 = await withOrigin(filterUser.agent.get(`/api/inspections?templateId=${templateA.id}&page=3&pageSize=2`));
      expect(page3.body.data).toHaveLength(1);

      const allIds = [...page1.body.data, ...page2.body.data, ...page3.body.data].map((i: { id: string }) => i.id);
      expect(new Set(allIds).size).toBe(5);
      expect(allIds.sort()).toEqual(templateAInspections.map((i) => i.id).sort());
    }, 60000);

    it('combines templateId with a status filter', async () => {
      const reviewed = await createInspectionRecord(filterUser, {
        title: `${filterWorkplace} tplA reviewed`,
        templateId: templateA.id,
      });
      const reviewUpdate = await withOrigin(filterUser.agent.patch(`/api/inspections/${reviewed.id}`)).send({
        status: 'Reviewed',
        actor: filterUser.name,
      });
      expect(reviewUpdate.status).toBe(200);

      const res = await withOrigin(filterUser.agent.get(`/api/inspections?templateId=${templateA.id}&status=Reviewed`));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(
        res.body.data.every((i: { templateId: string; status: string }) => i.templateId === templateA.id && i.status === 'Reviewed'),
      ).toBe(true);
    });

    it('still enforces workplace scoping when templateId is supplied', async () => {
      const otherSiteInspection = await createInspectionRecord(otherWorkplaceUser, {
        title: `${otherWorkplace} tplA insp`,
        templateId: templateA.id,
        workplace: otherWorkplace,
      });

      const res = await withOrigin(filterUser.agent.get(`/api/inspections?templateId=${templateA.id}&pageSize=100`));
      expect(res.status).toBe(200);
      expect(res.body.data.every((i: { workplace: string }) => i.workplace === filterWorkplace)).toBe(true);
      expect(res.body.data.some((i: { id: string }) => i.id === otherSiteInspection.id)).toBe(false);
    });

    describe('Lead inspector options', () => {
      it('are not limited to the currently loaded page', async () => {
        const names = ['P4 Insp One', 'P4 Insp Two', 'P4 Insp Three'];
        for (const name of names) {
          await createInspectionRecord(filterUser, { title: `${filterWorkplace} for ${name}`, leadInspector: name });
        }

        const listRes = await withOrigin(filterUser.agent.get('/api/inspections?page=1&pageSize=1'));
        expect(listRes.status).toBe(200);
        expect(listRes.body.data).toHaveLength(1);

        const optionsRes = await withOrigin(filterUser.agent.get('/api/inspections/lead-inspectors'));
        expect(optionsRes.status).toBe(200);
        for (const name of names) {
          expect(optionsRes.body.data).toContain(name);
        }
      });

      it('respects workplace scoping for a non-org-wide role', async () => {
        const uniqueName = 'P4 Only At Other Site';
        await createInspectionRecord(otherWorkplaceUser, {
          title: `${otherWorkplace} unique inspector`,
          leadInspector: uniqueName,
          workplace: otherWorkplace,
          templateId: templateA.id,
        });

        const res = await withOrigin(filterUser.agent.get('/api/inspections/lead-inspectors'));
        expect(res.status).toBe(200);
        expect(res.body.data).not.toContain(uniqueName);
      });

      it('gives Admin organisation-wide lead-inspector options across both sites', async () => {
        const res = await withOrigin(admin.agent.get('/api/inspections/lead-inspectors'));
        expect(res.status).toBe(200);
        expect(res.body.data).toContain('P4 Insp One');
        expect(res.body.data).toContain('P4 Only At Other Site');
      });
    });
  });
});

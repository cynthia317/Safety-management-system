import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { buildApp, cleanupAllTestData, createAndLoginUser, testWorkplaceName, withOrigin, type TestUser } from './helpers';

/**
 * Pilot finding: a Worker reported a Hazard successfully, but an EHS Officer expected to
 * see it via the dashboard and it "did not appear".
 *
 * Investigation (server/src/modules/dashboard/service.ts + controller.ts,
 * client/src/pages/DashboardPage.tsx):
 *   - The applicable existing metric is "Open Hazards" (`summary.openHazards`), which deep
 *     links to `/hazards?openOnly=true`. A newly-reported Hazard always starts at status
 *     'New', and `openHazards` counts every Hazard whose status is NOT in
 *     ['Resolved', 'Closed'] — so 'New' is always counted. No new dashboard card was needed.
 *   - The count is built with `workplaceScopeWhere(req.user!)` — the exact same scoping
 *     helper used everywhere else (My Actions, Hazard list, etc.) — so a same-workplace EHS
 *     Officer's count/list already includes it, and a different workplace's EHS Officer's
 *     does not.
 *   - No status-exclusion bug, no query bug, and no deep-link filter mismatch were found:
 *     `openOnly=true` on the Hazard list maps to the identical status set the dashboard
 *     count uses. These tests pin that down precisely, the same way the existing
 *     "Critical Hazards" dashboard test in phase4.test.ts already does for that metric.
 *   - No code change was required in the dashboard aggregation itself; the most plausible
 *     explanations for the live observation are outside this code path (e.g. the EHS
 *     Officer's dashboard tab was already loaded before the report was submitted and was
 *     never refreshed — this app has no live-push/polling on the dashboard — or the
 *     accounts' workplace text didn't actually match, the same category of issue the
 *     Hazard-assignment pilot fix addressed).
 */
describe('Pilot finding — newly reported Hazard on the EHS dashboard', () => {
  let app: Express;
  const siteA = testWorkplaceName('DashHazardA');
  const siteB = testWorkplaceName('DashHazardB');

  let workerA: TestUser;
  let ehsA: TestUser;
  let ehsB: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    app = buildApp();
    workerA = await createAndLoginUser(app, { name: 'DH Worker A', role: 'Worker', workplace: siteA, emailLabel: 'dh-workera' });
    ehsA = await createAndLoginUser(app, { name: 'DH EHS A', role: 'EHS Officer', workplace: siteA, emailLabel: 'dh-ehsa' });
    ehsB = await createAndLoginUser(app, { name: 'DH EHS B', role: 'EHS Officer', workplace: siteB, emailLabel: 'dh-ehsb' });
    admin = await createAndLoginUser(app, { name: 'DH Admin', role: 'Admin', workplace: siteA, emailLabel: 'dh-admin' });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  async function dashboardFor(user: TestUser) {
    const res = await withOrigin(user.agent.get('/api/dashboard/summary'));
    expect(res.status).toBe(200);
    return res.body.data as { openHazards: number; recentHazards: { id: string }[] };
  }

  async function openHazardsListFor(user: TestUser) {
    const res = await withOrigin(user.agent.get('/api/hazards?openOnly=true&pageSize=100'));
    expect(res.status).toBe(200);
    return res.body as { data: { id: string }[]; meta: { total: number } };
  }

  async function reportHazardAt(reporter: TestUser, workplace: string): Promise<string> {
    const res = await withOrigin(reporter.agent.post('/api/hazards')).send({
      title: `${workplace} newly reported hazard for dashboard visibility`,
      description: 'Hazard used to verify EHS dashboard visibility.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: reporter.name,
    });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  it('7. a newly reported Hazard increments the same-workplace EHS Officer’s Open Hazards count and appears in Recent Hazard Reports', async () => {
    const before = await dashboardFor(ehsA);
    const hazardId = await reportHazardAt(workerA, siteA);
    const after = await dashboardFor(ehsA);

    expect(after.openHazards).toBe(before.openHazards + 1);
    expect(after.recentHazards.some((h) => h.id === hazardId)).toBe(true);
  });

  it('8. the "Open Hazards" deep-link destination (/hazards?openOnly=true) contains the new Hazard', async () => {
    const hazardId = await reportHazardAt(workerA, siteA);
    const list = await openHazardsListFor(ehsA);
    expect(list.data.some((h) => h.id === hazardId)).toBe(true);
  });

  it('9. an EHS Officer at a different workplace neither counts nor sees the Hazard', async () => {
    const before = await dashboardFor(ehsB);
    const hazardId = await reportHazardAt(workerA, siteA);
    const after = await dashboardFor(ehsB);

    expect(after.openHazards).toBe(before.openHazards);
    expect(after.recentHazards.some((h) => h.id === hazardId)).toBe(false);

    const list = await openHazardsListFor(ehsB);
    expect(list.data.some((h) => h.id === hazardId)).toBe(false);
  });

  it('10. Admin sees it too, organisation-wide, alongside every other workplace’s open hazards', async () => {
    const before = await dashboardFor(admin);
    const hazardIdA = await reportHazardAt(workerA, siteA);
    const after = await dashboardFor(admin);

    expect(after.openHazards).toBeGreaterThanOrEqual(before.openHazards + 1);
    expect(after.recentHazards.some((h) => h.id === hazardIdA)).toBe(true);

    const list = await openHazardsListFor(admin);
    expect(list.data.some((h) => h.id === hazardIdA)).toBe(true);
  });

  it('11. the Open Hazards dashboard count exactly equals its deep-linked destination’s meta.total', async () => {
    await reportHazardAt(workerA, siteA);

    const summary = await dashboardFor(ehsA);
    const list = await openHazardsListFor(ehsA);
    expect(summary.openHazards).toBe(list.meta.total);

    const adminSummary = await dashboardFor(admin);
    const adminList = await openHazardsListFor(admin);
    expect(adminSummary.openHazards).toBe(adminList.meta.total);
  });
});

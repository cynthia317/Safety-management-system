import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { buildApp, cleanupAllTestData, createAndLoginUser, testWorkplaceName, withOrigin, type TestUser } from './helpers';
import { prisma } from '../src/lib/prisma';

interface MyActionItemRow {
  id: string;
  module: string;
  workplace: string;
  status: string;
  assignedTo?: string;
  active: boolean;
  overdue: boolean;
  dueSoon: boolean;
  recentlyCompleted: boolean;
  dueDate: string | null;
  route: string;
}

interface NotificationRow {
  id: string;
  type: string;
  relatedEntityId: string;
}

/**
 * Pilot finding: an Admin assigned a Worker-reported Hazard to a Supervisor via Assign
 * Officer, and the Supervisor did not see it in My Actions.
 *
 * Investigation (server/src/modules/myActions/service.ts) found Hazard assignments are
 * ALREADY aggregated into My Actions (`hazardItems`, wired into `getMyActions` alongside
 * Finding/CorrectiveAction/Inspection/RiskAssessment/Incident) — matched on
 * `HazardReport.assignedTo` (case-insensitive) plus the same workplace-scope guard used
 * everywhere else in My Actions, and already rendered by the client
 * (`MyActionsPage.tsx`'s `MODULE_LABEL`/`MODULE_ICON` already include `hazard`). No
 * aggregation code needed to be added or changed. These tests close a real *test* gap —
 * the existing "My Actions" describe block in phase4.test.ts only ever exercised
 * CorrectiveAction fixtures, so this exact path had no regression coverage — and pin down
 * the behavior the pilot expected.
 */
describe('Pilot finding — assigned Hazard in My Actions', () => {
  let app: Express;
  const siteA = testWorkplaceName('MyActionsA');
  const siteB = testWorkplaceName('MyActionsB');

  let admin: TestUser;
  let reporter: TestUser;
  let assignee: TestUser;
  let otherUserSameSite: TestUser;
  let sameNameOtherSite: TestUser;

  beforeAll(async () => {
    app = buildApp();
    admin = await createAndLoginUser(app, { name: 'MA Admin', role: 'Admin', workplace: siteA, emailLabel: 'ma-admin' });
    reporter = await createAndLoginUser(app, { name: 'MA Worker', role: 'Worker', workplace: siteA, emailLabel: 'ma-worker' });
    assignee = await createAndLoginUser(app, { name: 'MA Supervisor', role: 'Supervisor', workplace: siteA, emailLabel: 'ma-supervisor' });
    otherUserSameSite = await createAndLoginUser(app, { name: 'MA EHS', role: 'EHS Officer', workplace: siteA, emailLabel: 'ma-ehs' });
    // Same display name as `assignee`, but a distinct account at a different workplace —
    // proves My Actions resolves identity by workplace-scoped account, not name alone.
    sameNameOtherSite = await createAndLoginUser(app, {
      name: 'MA Supervisor',
      role: 'Supervisor',
      workplace: siteB,
      emailLabel: 'ma-collision',
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  async function createHazard(overrides: Record<string, unknown> = {}): Promise<string> {
    const res = await withOrigin(reporter.agent.post('/api/hazards')).send({
      title: 'My Actions hazard fixture',
      description: 'Hazard used to verify My Actions assignment surfacing.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace: siteA,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: reporter.name,
      ...overrides,
    });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  async function assign(hazardId: string, name: string) {
    const res = await withOrigin(admin.agent.patch(`/api/hazards/${hazardId}`)).send({ assignedTo: name });
    expect(res.status).toBe(200);
    return res.body.data;
  }

  async function myActionsFor(user: TestUser): Promise<MyActionItemRow[]> {
    const res = await withOrigin(user.agent.get('/api/my-actions'));
    expect(res.status).toBe(200);
    return res.body.data.items as MyActionItemRow[];
  }

  async function notificationsFor(user: TestUser): Promise<NotificationRow[]> {
    const res = await withOrigin(user.agent.get('/api/notifications'));
    expect(res.status).toBe(200);
    return res.body.data as NotificationRow[];
  }

  it('1. a Hazard assigned to the Supervisor appears in the Supervisor’s My Actions', async () => {
    const hazardId = await createHazard();
    await assign(hazardId, assignee.name);

    const items = await myActionsFor(assignee);
    const item = items.find((i) => i.id === hazardId);
    expect(item).toBeTruthy();
    expect(item!.module).toBe('hazard');
    expect(item!.route).toBe(`/hazards/${hazardId}`);
    expect(item!.workplace).toBe(siteA);
  });

  it('2. the same Hazard does not appear for a different, unrelated user at the same workplace', async () => {
    const hazardId = await createHazard();
    await assign(hazardId, assignee.name);

    const items = await myActionsFor(otherUserSameSite);
    expect(items.some((i) => i.id === hazardId)).toBe(false);
  });

  it('3. the reporter alone (never assigned) does not receive the Hazard in their own My Actions', async () => {
    const hazardId = await createHazard();
    await assign(hazardId, assignee.name);

    const items = await myActionsFor(reporter);
    expect(items.some((i) => i.id === hazardId)).toBe(false);
  });

  it('4. a same-named user at a different workplace does not receive it (no cross-site leakage by name match)', async () => {
    const hazardId = await createHazard();
    await assign(hazardId, assignee.name);

    const items = await myActionsFor(sameNameOtherSite);
    expect(items.some((i) => i.id === hazardId)).toBe(false);
  });

  it('5. an unassigned Hazard does not appear in anyone’s My Actions', async () => {
    const hazardId = await createHazard();

    const assigneeItems = await myActionsFor(assignee);
    const otherItems = await myActionsFor(otherUserSameSite);
    expect(assigneeItems.some((i) => i.id === hazardId)).toBe(false);
    expect(otherItems.some((i) => i.id === hazardId)).toBe(false);
  });

  it('6. an active assigned Hazard (Under Review / Action Required) is flagged active, with no due date/overdue concept', async () => {
    const hazardId = await createHazard();
    await assign(hazardId, assignee.name);
    const statusRes = await withOrigin(admin.agent.patch(`/api/hazards/${hazardId}`)).send({ status: 'Under Review' });
    expect(statusRes.status).toBe(200);

    const items = await myActionsFor(assignee);
    const item = items.find((i) => i.id === hazardId)!;
    expect(item.status).toBe('Under Review');
    expect(item.active).toBe(true);
    // Hazards have no due-date concept (server/src/lib/hazardSla.ts) — only overdue applies,
    // derived from reportedAt + risk SLA, not a stored due date.
    expect(item.dueDate).toBeNull();
    expect(item.dueSoon).toBe(false);
  });

  it('7. a Resolved/Closed assigned Hazard is no longer flagged active, and drops out of "recently completed" once its grace window has passed — matching the same convention as Finding/CorrectiveAction', async () => {
    const hazardId = await createHazard();
    await assign(hazardId, assignee.name);
    const resolveRes = await withOrigin(admin.agent.patch(`/api/hazards/${hazardId}`)).send({ status: 'Resolved' });
    expect(resolveRes.status).toBe(200);
    const closeRes = await withOrigin(admin.agent.patch(`/api/hazards/${hazardId}`)).send({ status: 'Closed' });
    expect(closeRes.status).toBe(200);

    const freshItems = await myActionsFor(assignee);
    const freshItem = freshItems.find((i) => i.id === hazardId)!;
    expect(freshItem.active).toBe(false);
    expect(freshItem.recentlyCompleted).toBe(true);

    // Simulate the 14-day "recently completed" window having elapsed — the real Hazard
    // lifecycle rule (server/src/modules/myActions/service.ts: RECENTLY_COMPLETED_WINDOW_DAYS)
    // is time-since-close, not a hard status filter, matching Finding/CorrectiveAction (only
    // Incident hard-excludes Closed outright).
    await prisma.hazardReport.update({
      where: { id: hazardId },
      data: { updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
    });

    const staleItems = await myActionsFor(assignee);
    const staleItem = staleItems.find((i) => i.id === hazardId)!;
    expect(staleItem.active).toBe(false);
    expect(staleItem.recentlyCompleted).toBe(false);
  });

  it('8. an assigned Corrective Action for the same user is unaffected — appears alongside the Hazard, not duplicated or displaced', async () => {
    const hazardId = await createHazard();
    await assign(hazardId, assignee.name);

    const caRes = await withOrigin(admin.agent.post('/api/corrective-actions')).send({
      title: `${siteA} CA alongside hazard`,
      description: 'Existing module must be unaffected by the Hazard My Actions fix.',
      workplace: siteA,
      department: 'Test dept',
      location: 'Test location',
      priority: 'Medium',
      assignedTo: assignee.name,
      dueDate: '2026-12-01',
      createdBy: admin.name,
    });
    expect(caRes.status).toBe(201);

    const items = await myActionsFor(assignee);
    expect(items.filter((i) => i.id === hazardId)).toHaveLength(1);
    expect(items.some((i) => i.id === caRes.body.data.id && i.module === 'corrective_action')).toBe(true);
  });

  it('9. assigning does not duplicate the notification when the same person is reassigned again with no actual change', async () => {
    const hazardId = await createHazard();
    await assign(hazardId, assignee.name);

    const afterFirst = await notificationsFor(assignee);
    const firstCount = afterFirst.filter((n) => n.relatedEntityId === hazardId && n.type === 'hazard_assigned').length;
    expect(firstCount).toBe(1);

    // Re-send the exact same assignedTo — the controller only notifies when the value
    // actually changes (value.assignedTo !== existing.assignedTo), so this must be a no-op.
    await assign(hazardId, assignee.name);

    const afterSecond = await notificationsFor(assignee);
    const secondCount = afterSecond.filter((n) => n.relatedEntityId === hazardId && n.type === 'hazard_assigned').length;
    expect(secondCount).toBe(1);
  });
});

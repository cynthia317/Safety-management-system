import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { buildApp, cleanupAllTestData, createAndLoginUser, testWorkplaceName, withOrigin, type TestUser } from './helpers';

interface AssignableUserRow {
  id: string;
  name: string;
  role: string;
}

interface NotificationRow {
  id: string;
  type: string;
  relatedEntityId: string;
  recipientId: string | null;
}

/**
 * Follow-up pilot fix: the previous investigation found the real defect behind "assigned
 * Hazard missing from My Actions" — an Admin's Assign Officer picker (GET
 * /api/users/assignable) returned every active user organisation-wide, not scoped to the
 * specific Hazard being assigned. An Admin could therefore assign a Workplace-A Hazard to a
 * user whose own account workplace is B; My Actions then (correctly) excludes it for that
 * user, since they're workplace-scoped like everyone else. The desired rule: a
 * workplace-scoped Hazard may only be assigned to an active user who belongs to that same
 * workplace — enforced both in the picker (UX) and server-side (authoritative), independent
 * of which role happens to be performing the assignment.
 */
describe('Pilot finding — Hazard assignment stays within its own workplace', () => {
  let app: Express;
  const siteA = testWorkplaceName('AssignSafetyA');
  const siteB = testWorkplaceName('AssignSafetyB');

  let admin: TestUser;
  let workerA: TestUser;
  let supervisorA: TestUser;
  let supervisorB: TestUser;
  let sameNameOtherSite: TestUser;

  beforeAll(async () => {
    app = buildApp();
    admin = await createAndLoginUser(app, { name: 'AS Admin', role: 'Admin', workplace: siteA, emailLabel: 'as-admin' });
    workerA = await createAndLoginUser(app, { name: 'AS Worker A', role: 'Worker', workplace: siteA, emailLabel: 'as-workera' });
    supervisorA = await createAndLoginUser(app, { name: 'AS Supervisor A', role: 'Supervisor', workplace: siteA, emailLabel: 'as-supervisora' });
    supervisorB = await createAndLoginUser(app, { name: 'AS Supervisor B', role: 'Supervisor', workplace: siteB, emailLabel: 'as-supervisorb' });
    // Same display name as supervisorA, but a distinct account at siteB — proves the
    // eligibility/notification checks resolve by workplace-scoped account, not name alone.
    sameNameOtherSite = await createAndLoginUser(app, {
      name: 'AS Supervisor A',
      role: 'Supervisor',
      workplace: siteB,
      emailLabel: 'as-collision',
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  async function createHazardAt(site: string): Promise<string> {
    const res = await withOrigin(workerA.agent.post('/api/hazards')).send({
      title: `${site} assignment-safety hazard`,
      description: 'Hazard used to verify assignment stays within its own workplace.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace: site,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: workerA.name,
    });
    // workerA is only scoped to siteA, so this only succeeds for siteA — used as-is below.
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  it('1. a same-workplace Supervisor is eligible — appears in the workplace-scoped assignable list', async () => {
    const res = await withOrigin(admin.agent.get(`/api/users/assignable?workplace=${encodeURIComponent(siteA)}`));
    expect(res.status).toBe(200);
    const names = (res.body.data as AssignableUserRow[]).map((u) => u.name);
    expect(names).toContain(supervisorA.name);
  });

  it('2. a cross-workplace Supervisor is not eligible — excluded from the same workplace-scoped list', async () => {
    const res = await withOrigin(admin.agent.get(`/api/users/assignable?workplace=${encodeURIComponent(siteA)}`));
    expect(res.status).toBe(200);
    const ids = (res.body.data as AssignableUserRow[]).map((u) => u.id);
    expect(ids).not.toContain(supervisorB.id);
    // The same-named account at siteB must not be offered either (name-collision guard).
    expect(ids).not.toContain(sameNameOtherSite.id);
  });

  it('3. the server rejects an injected cross-workplace assignedTo on reassignment, even bypassing the UI entirely', async () => {
    const hazardId = await createHazardAt(siteA);

    const res = await withOrigin(admin.agent.patch(`/api/hazards/${hazardId}`)).send({ assignedTo: supervisorB.name });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ASSIGNEE');

    // The hazard must remain unassigned — the rejected request must not have partially applied.
    const getRes = await withOrigin(admin.agent.get(`/api/hazards/${hazardId}`));
    expect(getRes.body.data.assignedTo).toBe('');
  });

  it('4. a same-workplace assignment succeeds and appears in the assignee’s My Actions', async () => {
    const hazardId = await createHazardAt(siteA);

    const patchRes = await withOrigin(admin.agent.patch(`/api/hazards/${hazardId}`)).send({ assignedTo: supervisorA.name });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.assignedTo).toBe(supervisorA.name);

    const myActionsRes = await withOrigin(supervisorA.agent.get('/api/my-actions'));
    expect(myActionsRes.status).toBe(200);
    const items = myActionsRes.body.data.items as { id: string }[];
    expect(items.some((i) => i.id === hazardId)).toBe(true);
  });

  it('5. a cross-workplace assignment cannot even be created directly (assignedTo set at creation time, not just on PATCH)', async () => {
    const res = await withOrigin(admin.agent.post('/api/hazards')).send({
      title: `${siteA} hazard created pre-assigned to a cross-site user`,
      description: 'Admin creating directly with a cross-workplace assignedTo — must be rejected.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace: siteA,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: admin.name,
      assignedTo: supervisorB.name,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ASSIGNEE');
  });

  it('6. the assignment notification reaches the correct same-workplace assignee, and never the same-named account at another workplace', async () => {
    const hazardId = await createHazardAt(siteA);
    const patchRes = await withOrigin(admin.agent.patch(`/api/hazards/${hazardId}`)).send({ assignedTo: supervisorA.name });
    expect(patchRes.status).toBe(200);

    const forAssignee = await withOrigin(supervisorA.agent.get('/api/notifications'));
    expect(forAssignee.status).toBe(200);
    const match = (forAssignee.body.data as NotificationRow[]).find(
      (n) => n.relatedEntityId === hazardId && n.type === 'hazard_assigned',
    );
    expect(match).toBeTruthy();
    expect(match!.recipientId).toBe(supervisorA.id);

    const forCollision = await withOrigin(sameNameOtherSite.agent.get('/api/notifications'));
    expect(forCollision.status).toBe(200);
    expect((forCollision.body.data as NotificationRow[]).find((n) => n.relatedEntityId === hazardId)).toBeUndefined();
  });
});

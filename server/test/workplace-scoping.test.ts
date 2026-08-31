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

describe('Phase 1 — workplace/site scoping', () => {
  let app: Express;
  const siteAlpha = testWorkplaceName('Alpha');
  const siteBeta = testWorkplaceName('Beta');

  let userAtAlpha: TestUser;
  let secondUserAtAlpha: TestUser;
  let userAtBeta: TestUser;
  let admin: TestUser;

  let hazardAtAlphaId: string;
  let correctiveActionAtAlphaId: string;

  beforeAll(async () => {
    app = buildApp();
    userAtAlpha = await createAndLoginUser(app, { name: 'Alpha EHS', role: 'EHS Officer', workplace: siteAlpha, emailLabel: 'alpha1' });
    secondUserAtAlpha = await createAndLoginUser(app, { name: 'Alpha Supervisor', role: 'Supervisor', workplace: siteAlpha, emailLabel: 'alpha2' });
    userAtBeta = await createAndLoginUser(app, { name: 'Beta EHS', role: 'EHS Officer', workplace: siteBeta, emailLabel: 'beta1' });
    // Admin's own workplace is irrelevant to its access — org-wide access is role-based.
    admin = await createAndLoginUser(app, { name: 'Scoping Admin', role: 'Admin', workplace: siteAlpha, emailLabel: 'admin' });

    const hazardRes = await withOrigin(userAtAlpha.agent.post('/api/hazards')).send({
      title: `${siteAlpha} hazard`,
      description: 'Test hazard for workplace scoping.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace: siteAlpha,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: userAtAlpha.name,
    });
    expect(hazardRes.status).toBe(201);
    hazardAtAlphaId = hazardRes.body.data.id;

    const caRes = await withOrigin(userAtAlpha.agent.post('/api/corrective-actions')).send({
      title: `${siteAlpha} corrective action`,
      description: 'Test corrective action for workplace scoping.',
      workplace: siteAlpha,
      department: 'Test dept',
      location: 'Test location',
      priority: 'Medium',
      assignedTo: userAtAlpha.name,
      dueDate: '2026-12-01',
      createdBy: userAtAlpha.name,
    });
    expect(caRes.status).toBe(201);
    correctiveActionAtAlphaId = caRes.body.data.id;
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('lets a user read a record at their own workplace', async () => {
    const res = await withOrigin(userAtAlpha.agent.get(`/api/hazards/${hazardAtAlphaId}`));
    expect(res.status).toBe(200);
  });

  it('lets a second user at the same workplace read and update the record (permitted access still works)', async () => {
    const getRes = await withOrigin(secondUserAtAlpha.agent.get(`/api/hazards/${hazardAtAlphaId}`));
    expect(getRes.status).toBe(200);

    // Supervisor is a non-Worker role, so canTriageHazard allows the status update.
    const patchRes = await withOrigin(secondUserAtAlpha.agent.patch(`/api/hazards/${hazardAtAlphaId}`)).send({
      status: 'Under Review',
    });
    expect(patchRes.status).toBe(200);
  });

  it('blocks a user at a different workplace from reading the hazard', async () => {
    const res = await withOrigin(userAtBeta.agent.get(`/api/hazards/${hazardAtAlphaId}`));
    expect(res.status).toBe(403);
  });

  it('blocks a user at a different workplace from updating the hazard', async () => {
    const res = await withOrigin(userAtBeta.agent.patch(`/api/hazards/${hazardAtAlphaId}`)).send({
      status: 'Closed',
    });
    expect(res.status).toBe(403);
  });

  it("excludes the other site's hazard from a scoped user's list", async () => {
    const res = await withOrigin(userAtBeta.agent.get('/api/hazards'));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((h: { id: string }) => h.id);
    expect(ids).not.toContain(hazardAtAlphaId);
  });

  it('blocks a user at a different workplace from reading a corrective action', async () => {
    const res = await withOrigin(userAtBeta.agent.get(`/api/corrective-actions/${correctiveActionAtAlphaId}`));
    expect(res.status).toBe(403);
  });

  it("still lets Admin read and list across every workplace", async () => {
    const getRes = await withOrigin(admin.agent.get(`/api/hazards/${hazardAtAlphaId}`));
    expect(getRes.status).toBe(200);

    const listRes = await withOrigin(admin.agent.get('/api/hazards'));
    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.map((h: { id: string }) => h.id);
    expect(ids).toContain(hazardAtAlphaId);
  });

  // Pilot fix (Phase 7 closure): a scoped user's workplace is now derived server-side from
  // the authenticated session rather than validated against the client-supplied value, so a
  // mismatched workplace in the payload is silently ignored instead of rejected — the record
  // is still only ever created at the caller's own workplace, never the one they attempted.
  it("never creates a record at a workplace the caller cannot access, ignoring a client-supplied mismatch instead of rejecting it", async () => {
    const res = await withOrigin(userAtBeta.agent.post('/api/hazards')).send({
      title: `${siteAlpha} cross-site attempt`,
      description: 'Should never be created at Alpha.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace: siteAlpha,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: userAtBeta.name,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.workplace).toBe(siteBeta);
    expect(res.body.data.workplace).not.toBe(siteAlpha);
  });
});

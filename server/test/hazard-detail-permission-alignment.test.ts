import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { buildApp, cleanupAllTestData, createAndLoginUser, testWorkplaceName, withOrigin, type TestUser } from './helpers';

/**
 * Pilot finding: HazardDetailPage exposed management controls (Assign Officer, Change
 * Status, Edit, Create Finding) to a Worker even though the backend has always rejected
 * those exact actions for a Worker (canTriageHazard / canManageFinding). The fix is UI-only
 * — hide the controls the server would reject — so these tests pin down the real backend
 * matrix the frontend now mirrors, and confirm hiding the buttons changed nothing for the
 * roles that were always allowed to use them.
 */
describe('Pilot finding — Hazard detail page: backend matrix behind the UI gating', () => {
  let app: Express;
  const workplace = testWorkplaceName('DetailAlign');

  let worker: TestUser;
  let ehsOfficer: TestUser;
  let hazardId: string;

  beforeAll(async () => {
    app = buildApp();
    worker = await createAndLoginUser(app, { name: 'Align Worker', role: 'Worker', workplace, emailLabel: 'da-worker' });
    ehsOfficer = await createAndLoginUser(app, { name: 'Align EHS', role: 'EHS Officer', workplace, emailLabel: 'da-ehs' });

    const res = await withOrigin(worker.agent.post('/api/hazards')).send({
      title: 'Detail page permission alignment hazard',
      description: 'Hazard used to verify detail-page control gating matches server rules.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: worker.name,
    });
    expect(res.status).toBe(201);
    hazardId = res.body.data.id;
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('blocks a Worker from changing status — the "Change Status" control the pilot found exposed', async () => {
    const res = await withOrigin(worker.agent.patch(`/api/hazards/${hazardId}`)).send({ status: 'Under Review' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Your role cannot review or update hazard reports.');
  });

  it('blocks a Worker from assigning/reassigning — the "Assign Officer" control the pilot found exposed', async () => {
    const res = await withOrigin(worker.agent.patch(`/api/hazards/${hazardId}`)).send({ assignedTo: ehsOfficer.name });
    expect(res.status).toBe(403);
  });

  it('blocks a Worker from editing any field of the hazard, including their own report — the "Edit" control the pilot found exposed', async () => {
    const res = await withOrigin(worker.agent.patch(`/api/hazards/${hazardId}`)).send({ title: 'Worker-edited title' });
    expect(res.status).toBe(403);
  });

  it('blocks a Worker from creating a Finding from the hazard — the "Create Finding" control the pilot found exposed', async () => {
    const res = await withOrigin(worker.agent.post('/api/findings')).send({
      hazardId,
      title: 'Should be rejected',
      description: 'Worker-created finding attempt.',
      workplace,
      department: 'Test dept',
      location: 'Test location',
      riskLevel: 'Medium',
      dueDate: '2026-12-01',
      assignedTo: worker.name,
      createdBy: worker.name,
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('still lets a Worker add a comment — a legitimate action that must not be caught up in the fix', async () => {
    const res = await withOrigin(worker.agent.post(`/api/hazards/${hazardId}/comments`)).send({
      author: worker.name,
      message: 'Adding a note as the reporter.',
    });
    expect(res.status).toBe(201);
  });

  it('still lets an authorized role (EHS Officer) change status, assign, edit, and create a Finding — no regression', async () => {
    const statusRes = await withOrigin(ehsOfficer.agent.patch(`/api/hazards/${hazardId}`)).send({ status: 'Under Review' });
    expect(statusRes.status).toBe(200);

    const assignRes = await withOrigin(ehsOfficer.agent.patch(`/api/hazards/${hazardId}`)).send({ assignedTo: ehsOfficer.name });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.assignedTo).toBe(ehsOfficer.name);

    const editRes = await withOrigin(ehsOfficer.agent.patch(`/api/hazards/${hazardId}`)).send({ title: 'EHS-edited title' });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.title).toBe('EHS-edited title');

    const findingRes = await withOrigin(ehsOfficer.agent.post('/api/findings')).send({
      hazardId,
      title: 'EHS-created finding',
      description: 'Authorized finding creation.',
      workplace,
      department: 'Test dept',
      location: 'Test location',
      riskLevel: 'Medium',
      dueDate: '2026-12-01',
      assignedTo: ehsOfficer.name,
      createdBy: ehsOfficer.name,
    });
    expect(findingRes.status).toBe(201);
  });
});

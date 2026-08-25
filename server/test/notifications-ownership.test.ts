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

describe('Phase 1 — notification ownership', () => {
  let app: Express;
  const workplace = testWorkplaceName('Notify');
  let creator: TestUser;
  let userA: TestUser;
  let userB: TestUser;
  let admin: TestUser;
  let notificationForA: string;
  let notificationForB: string;

  beforeAll(async () => {
    app = buildApp();
    creator = await createAndLoginUser(app, { name: 'Notify Creator', role: 'EHS Officer', workplace, emailLabel: 'creator' });
    userA = await createAndLoginUser(app, { name: 'Notify User A', role: 'Supervisor', workplace, emailLabel: 'usera' });
    userB = await createAndLoginUser(app, { name: 'Notify User B', role: 'Supervisor', workplace, emailLabel: 'userb' });
    admin = await createAndLoginUser(app, { name: 'Notify Admin', role: 'Admin', workplace, emailLabel: 'admin' });

    const caBase = {
      description: 'Test corrective action for notification ownership.',
      workplace,
      department: 'Test dept',
      location: 'Test location',
      priority: 'Medium',
      dueDate: '2026-12-01',
      // Validated as required even though the controller immediately overwrites it with
      // the authenticated caller's name (see correctiveActions/controller.ts) — matching
      // what the real frontend form sends.
      createdBy: creator.name,
    };

    // Creating a corrective action assigned to a user queues a `corrective_action_assigned`
    // notification for that user (see correctiveActions/service.ts) — this is the only
    // real event producer in the app right now, so it's used here to seed the fixture data.
    const resA = await withOrigin(creator.agent.post('/api/corrective-actions')).send({
      ...caBase,
      title: `${workplace} CA for A`,
      assignedTo: userA.name,
    });
    expect(resA.status).toBe(201);

    const resB = await withOrigin(creator.agent.post('/api/corrective-actions')).send({
      ...caBase,
      title: `${workplace} CA for B`,
      assignedTo: userB.name,
    });
    expect(resB.status).toBe(201);

    const listAsA = await withOrigin(userA.agent.get('/api/notifications'));
    notificationForA = listAsA.body.data.find((n: { subject: string }) => n.subject.includes(resA.body.data.referenceNumber))?.id;
    const listAsB = await withOrigin(userB.agent.get('/api/notifications'));
    notificationForB = listAsB.body.data.find((n: { subject: string }) => n.subject.includes(resB.body.data.referenceNumber))?.id;

    expect(notificationForA).toBeTruthy();
    expect(notificationForB).toBeTruthy();
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it("does not let User A see User B's notifications by default", async () => {
    const res = await withOrigin(userA.agent.get('/api/notifications'));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((n: { id: string }) => n.id);
    expect(ids).toContain(notificationForA);
    expect(ids).not.toContain(notificationForB);
  });

  it("ignores a client-supplied recipient query param for a non-Admin user", async () => {
    const res = await withOrigin(userA.agent.get(`/api/notifications?recipient=${encodeURIComponent(userB.name)}`));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((n: { id: string }) => n.id);
    expect(ids).not.toContain(notificationForB);
  });

  it("blocks User A from marking User B's notification as read", async () => {
    const res = await withOrigin(userA.agent.post(`/api/notifications/${notificationForB}/read`));
    expect(res.status).toBe(403);
  });

  it('lets User B read and mark their own notification as read', async () => {
    const listRes = await withOrigin(userB.agent.get('/api/notifications'));
    expect(listRes.body.data.map((n: { id: string }) => n.id)).toContain(notificationForB);

    const readRes = await withOrigin(userB.agent.post(`/api/notifications/${notificationForB}/read`));
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.readAt).toBeTruthy();
  });

  it("lets Admin explicitly view another user's notification feed", async () => {
    const res = await withOrigin(admin.agent.get(`/api/notifications?recipient=${encodeURIComponent(userA.name)}`));
    expect(res.status).toBe(200);
    expect(res.body.data.map((n: { id: string }) => n.id)).toContain(notificationForA);
  });
});

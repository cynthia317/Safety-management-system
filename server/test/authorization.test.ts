import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  buildApp,
  cleanupAllTestData,
  createAndLoginUser,
  testWorkplaceName,
  withOrigin,
  type TestUser,
} from './helpers';

describe('Phase 1 — role authorization', () => {
  let app: Express;
  const workplace = testWorkplaceName('Auth');
  let worker: TestUser;
  let ehsOfficer: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    app = buildApp();
    worker = await createAndLoginUser(app, { name: 'Test Worker', role: 'Worker', workplace, emailLabel: 'worker' });
    ehsOfficer = await createAndLoginUser(app, { name: 'Test EHS Officer', role: 'EHS Officer', workplace, emailLabel: 'ehs' });
    admin = await createAndLoginUser(app, { name: 'Test Admin', role: 'Admin', workplace, emailLabel: 'admin' });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/hazards');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  describe('risk assessment approval', () => {
    let riskAssessmentId: string;

    beforeAll(async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/risk-assessments')).send({
        title: `${workplace} RA`,
        assessmentType: 'Routine',
        description: 'Test risk assessment',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        assessedBy: ehsOfficer.name,
        assessmentDate: '2026-08-20',
        items: [],
      });
      expect(res.status).toBe(201);
      riskAssessmentId = res.body.data.id;
    });

    it('blocks a Worker from approving it', async () => {
      const res = await withOrigin(worker.agent.patch(`/api/risk-assessments/${riskAssessmentId}`)).send({
        status: 'Approved',
      });
      expect(res.status).toBe(403);
    });

    it('allows an EHS Officer to approve it', async () => {
      const res = await withOrigin(ehsOfficer.agent.patch(`/api/risk-assessments/${riskAssessmentId}`)).send({
        status: 'Approved',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Approved');
    });
  });

  describe('inspection template management', () => {
    let templateId: string;

    it('blocks a Worker from creating a template', async () => {
      const res = await withOrigin(worker.agent.post('/api/inspection-templates')).send({
        name: `${workplace} Template`,
        code: `T-${Date.now()}`,
        category: 'General Workplace Safety',
      });
      expect(res.status).toBe(403);
    });

    it('allows an EHS Officer to create a template', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/inspection-templates')).send({
        name: `${workplace} Template`,
        code: `T-${Date.now()}`,
        category: 'General Workplace Safety',
      });
      expect(res.status).toBe(201);
      templateId = res.body.data.id;
    });

    it('blocks a Worker from publishing (archiving/activating) it', async () => {
      const res = await withOrigin(worker.agent.patch(`/api/inspection-templates/${templateId}`)).send({
        status: 'Active',
      });
      expect(res.status).toBe(403);
    });

    it('allows an EHS Officer to publish it', async () => {
      const res = await withOrigin(ehsOfficer.agent.patch(`/api/inspection-templates/${templateId}`)).send({
        status: 'Active',
      });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Active');
    });
  });

  describe('workplace administration', () => {
    it('blocks a Worker from creating a workplace', async () => {
      const res = await withOrigin(worker.agent.post('/api/workplaces')).send({
        organisation: 'Test Org',
        name: testWorkplaceName('New'),
      });
      expect(res.status).toBe(403);
    });

    it('blocks an EHS Officer from creating a workplace (Admin-only)', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/workplaces')).send({
        organisation: 'Test Org',
        name: testWorkplaceName('New2'),
      });
      expect(res.status).toBe(403);
    });

    it('allows an Admin to create a workplace', async () => {
      const res = await withOrigin(admin.agent.post('/api/workplaces')).send({
        organisation: 'Test Org',
        name: testWorkplaceName('New3'),
      });
      expect(res.status).toBe(201);
    });
  });
});

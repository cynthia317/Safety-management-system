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

describe('Phase 2 — relational linkage', () => {
  let app: Express;
  const siteAlpha = testWorkplaceName('RelAlpha');
  const siteBeta = testWorkplaceName('RelBeta');

  let userAtAlpha: TestUser;
  let userAtBeta: TestUser;
  let workerAtAlpha: TestUser;

  let hazardAtAlphaId: string;
  let hazardAtAlphaRef: string;

  beforeAll(async () => {
    app = buildApp();
    userAtAlpha = await createAndLoginUser(app, { name: 'RelAlpha EHS', role: 'EHS Officer', workplace: siteAlpha, emailLabel: 'alpha' });
    userAtBeta = await createAndLoginUser(app, { name: 'RelBeta EHS', role: 'EHS Officer', workplace: siteBeta, emailLabel: 'beta' });
    workerAtAlpha = await createAndLoginUser(app, { name: 'RelAlpha Worker', role: 'Worker', workplace: siteAlpha, emailLabel: 'worker' });

    const hazardRes = await withOrigin(userAtAlpha.agent.post('/api/hazards')).send({
      title: `${siteAlpha} source hazard`,
      description: 'Hazard used as a Phase 2 relational-linkage source.',
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
    hazardAtAlphaRef = hazardRes.body.data.referenceNumber;
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Hazard -> Finding', () => {
    it('links a finding to a hazard in the same workplace', async () => {
      const res = await withOrigin(userAtAlpha.agent.post('/api/findings')).send({
        title: `${siteAlpha} finding from hazard`,
        description: 'Confirmed during review.',
        workplace: siteAlpha,
        department: 'Test dept',
        location: 'Test location',
        riskLevel: 'Medium',
        assignedTo: userAtAlpha.name,
        dueDate: '2026-12-01',
        createdBy: userAtAlpha.name,
        hazardId: hazardAtAlphaId,
        hazardReferenceNumber: hazardAtAlphaRef,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.hazardId).toBe(hazardAtAlphaId);
    });

    it('rejects a finding linked to a hazard in a different workplace', async () => {
      const res = await withOrigin(userAtBeta.agent.post('/api/findings')).send({
        title: `${siteBeta} finding attempt`,
        description: 'Should fail — cross-workplace hazard link.',
        workplace: siteBeta,
        department: 'Test dept',
        location: 'Test location',
        riskLevel: 'Medium',
        assignedTo: userAtBeta.name,
        dueDate: '2026-12-01',
        createdBy: userAtBeta.name,
        hazardId: hazardAtAlphaId,
        hazardReferenceNumber: hazardAtAlphaRef,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SOURCE_LINK');
    });

    it('rejects a finding linked to a nonexistent hazard', async () => {
      const res = await withOrigin(userAtAlpha.agent.post('/api/findings')).send({
        title: `${siteAlpha} finding, bad hazard`,
        description: 'Should fail — hazard does not exist.',
        workplace: siteAlpha,
        department: 'Test dept',
        location: 'Test location',
        riskLevel: 'Medium',
        assignedTo: userAtAlpha.name,
        dueDate: '2026-12-01',
        createdBy: userAtAlpha.name,
        hazardId: '00000000-0000-0000-0000-000000000000',
        hazardReferenceNumber: 'HZ-0000',
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SOURCE_LINK');
    });
  });

  describe('Inspection -> potential finding -> real Finding', () => {
    let templateId: string;
    let questionId: string;
    let sectionId: string;
    let inspectionId: string;

    beforeAll(async () => {
      const templateRes = await withOrigin(userAtAlpha.agent.post('/api/inspection-templates')).send({
        name: `${siteAlpha} template`,
        code: `T-${Date.now()}`,
        category: 'General Workplace Safety',
        sections: [
          {
            title: 'Section A',
            questions: [{ text: 'Is the fire exit clear?', responseType: 'compliance', required: true }],
          },
        ],
      });
      expect(templateRes.status).toBe(201);
      templateId = templateRes.body.data.id;
      sectionId = templateRes.body.data.sections[0].id;
      questionId = templateRes.body.data.sections[0].questions[0].id;

      const activateRes = await withOrigin(userAtAlpha.agent.patch(`/api/inspection-templates/${templateId}`)).send({
        status: 'Active',
      });
      expect(activateRes.status).toBe(200);

      const inspectionRes = await withOrigin(userAtAlpha.agent.post('/api/inspections')).send({
        templateId,
        title: `${siteAlpha} inspection`,
        workplace: siteAlpha,
        area: 'Test area',
        specificLocation: 'Test location',
        inspectionDate: '2026-08-20',
        leadInspector: userAtAlpha.name,
      });
      expect(inspectionRes.status).toBe(201);
      inspectionId = inspectionRes.body.data.id;

      const responseRes = await withOrigin(userAtAlpha.agent.post(`/api/inspections/${inspectionId}/responses`)).send({
        actor: userAtAlpha.name,
        responses: [
          {
            questionId,
            sectionId,
            responseType: 'compliance',
            value: 'Non-Compliant',
            notes: 'Blocked by pallets.',
            evidenceNote: '',
            potentialFinding: {
              title: 'Blocked fire exit',
              description: 'Pallets blocking the fire exit route.',
              riskLevel: 'High',
              recommendation: 'Clear the route.',
              immediateAction: 'Cordoned off.',
              status: 'Potential',
            },
          },
        ],
      });
      expect(responseRes.status).toBe(200);
    });

    it('creates a real Finding linked to the inspection', async () => {
      const res = await withOrigin(userAtAlpha.agent.post(`/api/inspections/${inspectionId}/responses/${questionId}/finding`)).send({
        title: 'Blocked fire exit',
        description: 'Pallets blocking the fire exit route.',
        riskLevel: 'High',
        assignedTo: userAtAlpha.name,
        dueDate: '2026-12-01',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.inspectionId).toBe(inspectionId);
      expect(res.body.data.questionResponseId).toBeTruthy();
    });

    it('reuses the existing Finding instead of creating a duplicate on a repeated call', async () => {
      const first = await withOrigin(
        userAtAlpha.agent.post(`/api/inspections/${inspectionId}/responses/${questionId}/finding`),
      ).send({ title: 'Blocked fire exit', description: 'Duplicate attempt.', riskLevel: 'High', assignedTo: userAtAlpha.name, dueDate: '2026-12-01' });

      expect(first.status).toBe(200); // 200, not 201 — reused, not created
      const listRes = await withOrigin(userAtAlpha.agent.get(`/api/findings?inspectionId=${inspectionId}`));
      expect(listRes.body.data.length).toBe(1);
    });

    it('blocks a Worker from creating a finding this way', async () => {
      const res = await withOrigin(
        workerAtAlpha.agent.post(`/api/inspections/${inspectionId}/responses/${questionId}/finding`),
      ).send({ title: 'x', description: 'x', riskLevel: 'Low', assignedTo: workerAtAlpha.name, dueDate: '2026-12-01' });
      expect(res.status).toBe(403);
    });
  });

  describe('Finding -> Corrective Action', () => {
    let findingId: string;
    let findingRef: string;

    beforeAll(async () => {
      const res = await withOrigin(userAtAlpha.agent.post('/api/findings')).send({
        title: `${siteAlpha} finding for CA`,
        description: 'Source finding for a corrective action.',
        workplace: siteAlpha,
        department: 'Test dept',
        location: 'Test location',
        riskLevel: 'Medium',
        assignedTo: userAtAlpha.name,
        dueDate: '2026-12-01',
        createdBy: userAtAlpha.name,
      });
      expect(res.status).toBe(201);
      findingId = res.body.data.id;
      findingRef = res.body.data.referenceNumber;
    });

    it('links a corrective action to the finding and derives sourceType', async () => {
      const res = await withOrigin(userAtAlpha.agent.post('/api/corrective-actions')).send({
        title: 'Fix from finding',
        description: 'Corrective action sourced from a finding.',
        workplace: siteAlpha,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Medium',
        assignedTo: userAtAlpha.name,
        dueDate: '2026-12-01',
        createdBy: userAtAlpha.name,
        findingId,
        findingReferenceNumber: findingRef,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.findingId).toBe(findingId);
      expect(res.body.data.sourceType).toBe('Finding');
    });
  });

  describe('Risk Assessment -> Corrective Action', () => {
    let riskAssessmentAlphaId: string;
    let riskAssessmentAlphaRef: string;

    beforeAll(async () => {
      const res = await withOrigin(userAtAlpha.agent.post('/api/risk-assessments')).send({
        title: `${siteAlpha} RA for CA`,
        assessmentType: 'Routine',
        description: 'Source risk assessment.',
        workplace: siteAlpha,
        department: 'Test dept',
        assessedBy: userAtAlpha.name,
        assessmentDate: '2026-08-20',
        items: [],
      });
      expect(res.status).toBe(201);
      riskAssessmentAlphaId = res.body.data.id;
      riskAssessmentAlphaRef = res.body.data.referenceNumber;
    });

    it('links a corrective action to the risk assessment and derives sourceType', async () => {
      const res = await withOrigin(userAtAlpha.agent.post('/api/corrective-actions')).send({
        title: 'Additional control from RA',
        description: 'Corrective action sourced from a risk assessment.',
        workplace: siteAlpha,
        department: 'Test dept',
        location: 'Test location',
        priority: 'High',
        assignedTo: userAtAlpha.name,
        dueDate: '2026-12-01',
        createdBy: userAtAlpha.name,
        riskAssessmentId: riskAssessmentAlphaId,
        riskAssessmentReferenceNumber: riskAssessmentAlphaRef,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.riskAssessmentId).toBe(riskAssessmentAlphaId);
      expect(res.body.data.sourceType).toBe('Risk Assessment');
    });

    it('rejects a corrective action linking to a risk assessment in a different workplace', async () => {
      const res = await withOrigin(userAtBeta.agent.post('/api/corrective-actions')).send({
        title: 'Cross-site attempt',
        description: 'Should fail.',
        workplace: siteBeta,
        department: 'Test dept',
        location: 'Test location',
        priority: 'High',
        assignedTo: userAtBeta.name,
        dueDate: '2026-12-01',
        createdBy: userAtBeta.name,
        riskAssessmentId: riskAssessmentAlphaId,
        riskAssessmentReferenceNumber: riskAssessmentAlphaRef,
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_SOURCE_LINK');
    });
  });

  describe('legacy / no source link', () => {
    it('still allows creating a corrective action with no relational source at all', async () => {
      const res = await withOrigin(userAtAlpha.agent.post('/api/corrective-actions')).send({
        title: 'Manual entry, no source',
        description: 'A corrective action entered manually.',
        workplace: siteAlpha,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Low',
        assignedTo: userAtAlpha.name,
        dueDate: '2026-12-01',
        createdBy: userAtAlpha.name,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.sourceType).toBe('Manual Entry');
      expect(res.body.data.findingId).toBeNull();
      expect(res.body.data.hazardId).toBeNull();
      expect(res.body.data.riskAssessmentId).toBeNull();
    });
  });
});

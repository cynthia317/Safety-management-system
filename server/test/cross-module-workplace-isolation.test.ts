import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { buildApp, cleanupAllTestData, createAndLoginUser, testWorkplaceName, withOrigin, type TestUser } from './helpers';

/**
 * Pilot audit, cross-module sweep (section 10): Hazards and Corrective Actions already had
 * workplace-isolation regression coverage (workplace-scoping.test.ts), but Incidents,
 * Inspections, Findings, and Risk Assessments did not. Code inspection confirmed every one
 * of these controllers applies the same `workplaceScopeWhere`/`canAccessRecordWorkplace`
 * pattern as Hazards, so no code change was needed here — these tests close the coverage
 * gap and pin the behavior down.
 */
describe('Pilot audit — cross-module workplace isolation (Incidents, Inspections, Findings, Risk Assessments)', () => {
  let app: Express;
  const siteA = testWorkplaceName('CrossModA');
  const siteB = testWorkplaceName('CrossModB');

  let ehsA: TestUser;
  let ehsB: TestUser;

  let incidentAId: string;
  let inspectionAId: string;
  let findingAId: string;
  let riskAssessmentAId: string;

  beforeAll(async () => {
    app = buildApp();
    ehsA = await createAndLoginUser(app, { name: 'CrossMod EHS A', role: 'EHS Officer', workplace: siteA, emailLabel: 'cm-ehsa' });
    ehsB = await createAndLoginUser(app, { name: 'CrossMod EHS B', role: 'EHS Officer', workplace: siteB, emailLabel: 'cm-ehsb' });

    const incidentRes = await withOrigin(ehsA.agent.post('/api/incidents')).send({
      eventType: 'Incident',
      category: 'Equipment',
      title: `${siteA} cross-module incident`,
      description: 'Incident used for cross-module workplace isolation audit.',
      workplace: siteA,
      department: 'Test dept',
      location: 'Test location',
      eventDate: '2026-08-20',
      peopleInvolved: '',
      injuryOccurred: false,
      immediateActionTaken: '',
      actualSeverity: 'Low',
      potentialSeverity: 'Medium',
    });
    expect(incidentRes.status).toBe(201);
    incidentAId = incidentRes.body.data.id;

    const templateRes = await withOrigin(ehsA.agent.post('/api/inspection-templates')).send({
      name: `${siteA} cross-module template`,
      code: `CM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category: 'General Workplace Safety',
      sections: [{ title: 'Section A', questions: [{ text: 'Is it safe?', responseType: 'compliance', required: false }] }],
    });
    expect(templateRes.status).toBe(201);
    const activateRes = await withOrigin(ehsA.agent.patch(`/api/inspection-templates/${templateRes.body.data.id}`)).send({
      status: 'Active',
    });
    expect(activateRes.status).toBe(200);

    const inspectionRes = await withOrigin(ehsA.agent.post('/api/inspections')).send({
      templateId: templateRes.body.data.id,
      title: `${siteA} cross-module inspection`,
      workplace: siteA,
      area: 'Test area',
      specificLocation: 'Test location',
      inspectionDate: new Date().toISOString(),
      leadInspector: ehsA.name,
    });
    expect(inspectionRes.status).toBe(201);
    inspectionAId = inspectionRes.body.data.id;

    const findingRes = await withOrigin(ehsA.agent.post('/api/findings')).send({
      title: `${siteA} cross-module finding`,
      description: 'Finding used for cross-module workplace isolation audit.',
      workplace: siteA,
      department: 'Test dept',
      location: 'Test location',
      riskLevel: 'Medium',
      dueDate: '2026-12-01',
      assignedTo: ehsA.name,
      createdBy: ehsA.name,
    });
    expect(findingRes.status).toBe(201);
    findingAId = findingRes.body.data.id;

    const raRes = await withOrigin(ehsA.agent.post('/api/risk-assessments')).send({
      title: `${siteA} cross-module RA`,
      assessmentType: 'Routine',
      description: 'Risk assessment used for cross-module workplace isolation audit.',
      workplace: siteA,
      department: 'Test dept',
      location: 'Test location',
      assessedBy: ehsA.name,
      assessmentDate: '2026-08-20',
      items: [],
    });
    expect(raRes.status).toBe(201);
    riskAssessmentAId = raRes.body.data.id;
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('Incidents: a different-workplace user cannot fetch by id, and the list excludes it', async () => {
    const getRes = await withOrigin(ehsB.agent.get(`/api/incidents/${incidentAId}`));
    expect(getRes.status).toBe(403);

    const listRes = await withOrigin(ehsB.agent.get('/api/incidents'));
    expect(listRes.status).toBe(200);
    expect((listRes.body.data as { id: string }[]).some((i) => i.id === incidentAId)).toBe(false);
  });

  it('Inspections: a different-workplace user cannot fetch by id, and the list excludes it', async () => {
    const getRes = await withOrigin(ehsB.agent.get(`/api/inspections/${inspectionAId}`));
    expect(getRes.status).toBe(403);

    const listRes = await withOrigin(ehsB.agent.get('/api/inspections'));
    expect(listRes.status).toBe(200);
    expect((listRes.body.data as { id: string }[]).some((i) => i.id === inspectionAId)).toBe(false);
  });

  it('Findings: a different-workplace user cannot fetch by id, and the list excludes it', async () => {
    const getRes = await withOrigin(ehsB.agent.get(`/api/findings/${findingAId}`));
    expect(getRes.status).toBe(403);

    const listRes = await withOrigin(ehsB.agent.get('/api/findings'));
    expect(listRes.status).toBe(200);
    expect((listRes.body.data as { id: string }[]).some((f) => f.id === findingAId)).toBe(false);
  });

  it('Risk Assessments: a different-workplace user cannot fetch by id, and the list excludes it', async () => {
    const getRes = await withOrigin(ehsB.agent.get(`/api/risk-assessments/${riskAssessmentAId}`));
    expect(getRes.status).toBe(403);

    const listRes = await withOrigin(ehsB.agent.get('/api/risk-assessments'));
    expect(listRes.status).toBe(200);
    expect((listRes.body.data as { id: string }[]).some((r) => r.id === riskAssessmentAId)).toBe(false);
  });

  it('a same-workplace user (EHS A) retains full access to every fixture — no over-broad restriction', async () => {
    const incidentRes = await withOrigin(ehsA.agent.get(`/api/incidents/${incidentAId}`));
    expect(incidentRes.status).toBe(200);

    const inspectionRes = await withOrigin(ehsA.agent.get(`/api/inspections/${inspectionAId}`));
    expect(inspectionRes.status).toBe(200);

    const findingRes = await withOrigin(ehsA.agent.get(`/api/findings/${findingAId}`));
    expect(findingRes.status).toBe(200);

    const raRes = await withOrigin(ehsA.agent.get(`/api/risk-assessments/${riskAssessmentAId}`));
    expect(raRes.status).toBe(200);
  });

  it('a client-supplied cross-workplace filter on a list request is overridden, not honored, for every module', async () => {
    const incidentList = await withOrigin(ehsB.agent.get(`/api/incidents?workplace=${encodeURIComponent(siteA)}`));
    expect((incidentList.body.data as { id: string }[]).some((i) => i.id === incidentAId)).toBe(false);

    const inspectionList = await withOrigin(ehsB.agent.get(`/api/inspections?workplace=${encodeURIComponent(siteA)}`));
    expect((inspectionList.body.data as { id: string }[]).some((i) => i.id === inspectionAId)).toBe(false);

    const findingList = await withOrigin(ehsB.agent.get(`/api/findings?workplace=${encodeURIComponent(siteA)}`));
    expect((findingList.body.data as { id: string }[]).some((f) => f.id === findingAId)).toBe(false);

    const raList = await withOrigin(ehsB.agent.get(`/api/risk-assessments?workplace=${encodeURIComponent(siteA)}`));
    expect((raList.body.data as { id: string }[]).some((r) => r.id === riskAssessmentAId)).toBe(false);
  });
});

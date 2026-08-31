import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import {
  buildApp,
  cleanupAllTestData,
  createAndLoginUser,
  testEmail,
  testWorkplaceName,
  withOrigin,
  TEST_PASSWORD,
  type TestUser,
} from './helpers';
import * as authService from '../src/modules/auth/service';

/**
 * Pilot findings, Phase 7 closure:
 *   1. A Worker reporting a hazard for their own workplace was rejected with "You do not
 *      have access to this workplace." — root cause was the client Workplace field being a
 *      free-text input never pre-filled from the session, so a Worker had to retype their
 *      own workplace name exactly (case/whitespace-sensitive at the human-typo level) or be
 *      rejected. The fix derives workplace server-side from the session for every scoped
 *      role, so the client value can no longer cause (or fake) a mismatch.
 *   2. Workers could see and use the "Assigned Safety Officer" control during initial
 *      hazard reporting — assignment is a triage action that should only happen afterward,
 *      performed by Supervisor/EHS/Admin.
 */
describe('Pilot findings — Worker hazard creation: workplace scope + initial assignment', () => {
  let app: Express;
  const siteAlpha = testWorkplaceName('PilotAlpha');
  const siteBeta = testWorkplaceName('PilotBeta');

  let workerAlpha: TestUser;
  let ehsAlpha: TestUser;
  let ehsBeta: TestUser;
  let admin: TestUser;
  let workerNoWorkplace: TestUser;

  beforeAll(async () => {
    app = buildApp();
    workerAlpha = await createAndLoginUser(app, { name: 'Pilot Worker', role: 'Worker', workplace: siteAlpha, emailLabel: 'pw-worker' });
    ehsAlpha = await createAndLoginUser(app, { name: 'Pilot EHS Alpha', role: 'EHS Officer', workplace: siteAlpha, emailLabel: 'pw-ehsalpha' });
    ehsBeta = await createAndLoginUser(app, { name: 'Pilot EHS Beta', role: 'EHS Officer', workplace: siteBeta, emailLabel: 'pw-ehsbeta' });
    admin = await createAndLoginUser(app, { name: 'Pilot Admin', role: 'Admin', workplace: siteAlpha, emailLabel: 'pw-admin' });

    // Built directly via the service layer (bypassing registration's required-field
    // validation) to reproduce an account with no workplace assignment at all — requirement
    // 5 needs this state to exist, which self-registration would never normally allow.
    const email = testEmail('pw-noworkplace');
    const user = await authService.createUser({
      name: 'Workplace-less Worker',
      email,
      password: TEST_PASSWORD,
      role: 'Worker',
      workplace: '',
    });
    const agent = request.agent(app);
    const loginRes = await withOrigin(agent.post('/api/auth/login')).send({ email, password: TEST_PASSWORD });
    if (loginRes.status !== 200) {
      throw new Error(`Test login failed for ${email}: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
    }
    workerNoWorkplace = { agent, id: user.id, name: user.name, email: user.email, role: user.role, workplace: user.workplace };
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  function payload(workplace: string, overrides: Record<string, unknown> = {}) {
    return {
      title: 'Pilot regression hazard',
      description: 'Hazard used by the worker workplace/assignment regression tests.',
      reportType: 'Unsafe Condition',
      hazardCategory: 'Other',
      workplace,
      department: 'Test dept',
      location: 'Test location',
      peopleAtRisk: 'Test staff',
      riskLevel: 'Medium',
      reportedBy: 'This must never end up as the actual reporter',
      ...overrides,
    };
  }

  it('1. lets a Worker create a Hazard for their own assigned workplace', async () => {
    const res = await withOrigin(workerAlpha.agent.post('/api/hazards')).send(payload(siteAlpha));
    expect(res.status).toBe(201);
    expect(res.body.data.workplace).toBe(siteAlpha);
    // The reporter is always the authenticated caller, never client-supplied.
    expect(res.body.data.reportedBy).toBe(workerAlpha.name);
  });

  it('2 & 3. cannot report for, or spoof, another workplace through the request payload — server derives it from the session', async () => {
    const res = await withOrigin(workerAlpha.agent.post('/api/hazards')).send(
      payload(siteBeta, { title: 'Cross-site spoof attempt' }),
    );
    expect(res.status).toBe(201);
    expect(res.body.data.workplace).toBe(siteAlpha);
    expect(res.body.data.workplace).not.toBe(siteBeta);

    // Confirm the record never actually lands at the targeted workplace, not just that the
    // response was silently corrected.
    const betaListRes = await withOrigin(ehsBeta.agent.get('/api/hazards'));
    expect(betaListRes.status).toBe(200);
    const betaTitles = betaListRes.body.data.map((h: { title: string }) => h.title);
    expect(betaTitles).not.toContain('Cross-site spoof attempt');
  });

  it('a mistyped/case-mismatched workplace from a Worker no longer causes a false rejection (root cause of the pilot failure)', async () => {
    const messyWorkplace = `  ${siteAlpha.toUpperCase()}  `;
    const res = await withOrigin(workerAlpha.agent.post('/api/hazards')).send(payload(messyWorkplace));
    expect(res.status).toBe(201);
    expect(res.body.data.workplace).toBe(siteAlpha);
  });

  it('4. gives a Worker with no workplace assignment a controlled, actionable error instead of bypassing security', async () => {
    const res = await withOrigin(workerNoWorkplace.agent.post('/api/hazards')).send(payload(siteAlpha));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NO_WORKPLACE');
    expect(res.body.error.message).toBe('Your account is not assigned to a workplace. Contact your SafetyOS administrator.');
  });

  it('5. still lets Admin create a Hazard for any workplace, organisation-wide', async () => {
    const res = await withOrigin(admin.agent.post('/api/hazards')).send(payload(siteBeta));
    expect(res.status).toBe(201);
    expect(res.body.data.workplace).toBe(siteBeta);
  });

  it('6. blocks a Worker from assigning the Hazard to someone else during initial reporting', async () => {
    const res = await withOrigin(workerAlpha.agent.post('/api/hazards')).send(
      payload(siteAlpha, { assignedTo: ehsAlpha.name }),
    );
    expect(res.status).toBe(201);
    expect(res.body.data.assignedTo).toBe('');
  });

  it('7. cannot bypass the assignment restriction through direct API manipulation', async () => {
    const res = await withOrigin(workerAlpha.agent.post('/api/hazards')).send(
      payload(siteAlpha, { assignedTo: admin.name, reportedBy: 'Someone Else Entirely' }),
    );
    expect(res.status).toBe(201);
    expect(res.body.data.assignedTo).toBe('');
    expect(res.body.data.reportedBy).toBe(workerAlpha.name);
  });

  it('8. still lets an authorized management role (EHS Officer) assign during initial reporting', async () => {
    const res = await withOrigin(ehsAlpha.agent.post('/api/hazards')).send(
      payload(siteAlpha, { assignedTo: ehsAlpha.name }),
    );
    expect(res.status).toBe(201);
    expect(res.body.data.assignedTo).toBe(ehsAlpha.name);
  });

  it('8b. still lets an authorized role reassign a Hazard after creation (existing triage workflow preserved)', async () => {
    const createRes = await withOrigin(workerAlpha.agent.post('/api/hazards')).send(payload(siteAlpha));
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.assignedTo).toBe('');

    const patchRes = await withOrigin(ehsAlpha.agent.patch(`/api/hazards/${createRes.body.data.id}`)).send({
      assignedTo: ehsAlpha.name,
    });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.assignedTo).toBe(ehsAlpha.name);
  });

  it('still blocks a Worker from reassigning a Hazard after creation (existing triage gate unaffected)', async () => {
    const createRes = await withOrigin(workerAlpha.agent.post('/api/hazards')).send(payload(siteAlpha));
    expect(createRes.status).toBe(201);

    const patchRes = await withOrigin(workerAlpha.agent.patch(`/api/hazards/${createRes.body.data.id}`)).send({
      assignedTo: workerAlpha.name,
    });
    expect(patchRes.status).toBe(403);
  });
});

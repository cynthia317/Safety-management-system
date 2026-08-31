import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { prisma } from '../src/lib/prisma';
import { buildApp, cleanupAllTestData, createAndLoginUser, testWorkplaceName, withOrigin, type TestUser } from './helpers';

// Verified independently: iVBORw0KGgo= decodes to the 8-byte PNG signature
// 89 50 4E 47 0D 0A 1A 0A; /9j/4A== decodes to the 4-byte JPEG signature FF D8 FF E0.
const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';
const PNG_BYTES = 8;
const JPEG_BYTES_AS_PNG_DATA_URL = 'data:image/png;base64,/9j/4A==';

function oversizedPngDataUrl(totalBytes: number): string {
  const buffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(totalBytes - 8)]);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

interface NotificationRow {
  id: string;
  type: string;
  recipient: string;
  recipientId: string | null;
  relatedEntityId: string;
}

describe('Phase 6 — Incident / Near-Miss module', () => {
  let app: Express;
  const siteA = testWorkplaceName('P6SiteA');
  const siteB = testWorkplaceName('P6SiteB');

  let worker: TestUser;
  let supervisor: TestUser;
  let ehsOfficer: TestUser;
  let admin: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    app = buildApp();
    worker = await createAndLoginUser(app, { name: 'P6 Worker', role: 'Worker', workplace: siteA, emailLabel: 'p6worker' });
    supervisor = await createAndLoginUser(app, { name: 'P6 Supervisor', role: 'Supervisor', workplace: siteA, emailLabel: 'p6super' });
    ehsOfficer = await createAndLoginUser(app, { name: 'P6 EHS', role: 'EHS Officer', workplace: siteA, emailLabel: 'p6ehs' });
    admin = await createAndLoginUser(app, { name: 'P6 Admin', role: 'Admin', workplace: siteA, emailLabel: 'p6admin' });
    userB = await createAndLoginUser(app, { name: 'P6 User B', role: 'EHS Officer', workplace: siteB, emailLabel: 'p6userb' });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  function baseIncidentPayload(creator: TestUser, overrides: Record<string, unknown> = {}) {
    return {
      eventType: 'Incident',
      category: 'Equipment',
      title: `${creator.workplace} incident`,
      description: 'Phase 6 test incident.',
      workplace: creator.workplace,
      department: 'Test dept',
      location: 'Test location',
      eventDate: '2026-08-20',
      peopleInvolved: '',
      injuryOccurred: false,
      immediateActionTaken: '',
      actualSeverity: 'Low',
      potentialSeverity: 'Medium',
      ...overrides,
    };
  }

  async function createIncident(creator: TestUser, overrides: Record<string, unknown> = {}) {
    const res = await withOrigin(creator.agent.post('/api/incidents')).send(baseIncidentPayload(creator, overrides));
    expect(res.status).toBe(201);
    return res.body.data;
  }

  async function notificationsFor(user: TestUser): Promise<NotificationRow[]> {
    const res = await withOrigin(user.agent.get('/api/notifications'));
    expect(res.status).toBe(200);
    return res.body.data as NotificationRow[];
  }

  describe('Authorization', () => {
    it('lets a Worker report an incident', async () => {
      const incident = await createIncident(worker);
      expect(incident.reportedBy).toBe(worker.name);
    });

    it('derives/enforces workplace from the authenticated session, not the request body', async () => {
      const res = await withOrigin(worker.agent.post('/api/incidents')).send(baseIncidentPayload(worker, { workplace: siteB }));
      expect(res.status).toBe(403);
    });

    it('blocks cross-workplace read', async () => {
      const incident = await createIncident(ehsOfficer);
      const res = await withOrigin(userB.agent.get(`/api/incidents/${incident.id}`));
      expect(res.status).toBe(403);
    });

    it('gives Admin organisation-wide read access', async () => {
      const incident = await createIncident(userB);
      const res = await withOrigin(admin.agent.get(`/api/incidents/${incident.id}`));
      expect(res.status).toBe(200);
    });

    it('blocks a Worker from editing the report', async () => {
      const incident = await createIncident(worker);
      const res = await withOrigin(worker.agent.patch(`/api/incidents/${incident.id}`)).send({ description: 'Edited by worker.' });
      expect(res.status).toBe(403);
    });

    it('blocks a Worker from assigning an investigator, and a Worker/Supervisor from closing', async () => {
      const incident = await createIncident(ehsOfficer);

      const workerAssign = await withOrigin(worker.agent.patch(`/api/incidents/${incident.id}`)).send({ leadInvestigator: worker.name });
      expect(workerAssign.status).toBe(403);

      const supervisorAssign = await withOrigin(supervisor.agent.patch(`/api/incidents/${incident.id}`)).send({
        leadInvestigator: supervisor.name,
      });
      expect(supervisorAssign.status).toBe(200);

      const underInvestigation = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({
        status: 'Under Investigation',
      });
      expect(underInvestigation.status).toBe(200);

      const supervisorClose = await withOrigin(supervisor.agent.patch(`/api/incidents/${incident.id}`)).send({
        status: 'Resolved',
        investigationSummary: 'Reviewed, no action needed.',
      });
      expect(supervisorClose.status).toBe(200);

      const supervisorTryClose = await withOrigin(supervisor.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Closed' });
      expect(supervisorTryClose.status).toBe(403);
    });
  });

  describe('CRUD', () => {
    it('reports an Incident and a Near Miss, with a server-generated INC-<year>-#### reference', async () => {
      const incident = await createIncident(ehsOfficer, { eventType: 'Incident' });
      const nearMiss = await createIncident(ehsOfficer, { eventType: 'NearMiss' });

      expect(incident.eventType).toBe('Incident');
      expect(nearMiss.eventType).toBe('NearMiss');
      expect(incident.referenceNumber).toMatch(/^INC-\d{4}-\d{4}$/);
      expect(nearMiss.referenceNumber).toMatch(/^INC-\d{4}-\d{4}$/);
      expect(incident.referenceNumber).not.toBe(nearMiss.referenceNumber);
    });

    it('ignores a client-supplied reportedBy and always uses the authenticated session', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/incidents')).send({
        ...baseIncidentPayload(ehsOfficer),
        reportedBy: 'Someone Else Entirely',
      });
      expect(res.status).toBe(201);
      expect(res.body.data.reportedBy).toBe(ehsOfficer.name);
    });

    it('updates permitted fields and records an "updated" activity entry', async () => {
      const incident = await createIncident(ehsOfficer);
      const res = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ description: 'Revised description.' });
      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Revised description.');
      const updatedEntry = res.body.data.activity.find((a: { type: string }) => a.type === 'updated');
      expect(updatedEntry).toBeTruthy();
      expect(updatedEntry.message).toContain('description');
    });
  });

  describe('Status lifecycle and closure', () => {
    it('allows the approved forward transitions and rejects an out-of-graph jump', async () => {
      const incident = await createIncident(ehsOfficer);

      const jump = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Closed' });
      expect(jump.status).toBe(400);

      const toInvestigation = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({
        status: 'Under Investigation',
      });
      expect(toInvestigation.status).toBe(200);
      expect(toInvestigation.body.data.activity.some((a: { type: string }) => a.type === 'status_change')).toBe(true);
    });

    it('rejects closure without an investigation summary', async () => {
      const incident = await createIncident(ehsOfficer);
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Under Investigation' });
      const resolved = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Resolved' });
      expect(resolved.status).toBe(200);

      const closeAttempt = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Closed' });
      expect(closeAttempt.status).toBe(400);
      expect(closeAttempt.body.error.message).toMatch(/investigation summary/i);
    });

    it('rejects closure while a linked corrective action is still open, then succeeds once it is Verified', async () => {
      const incident = await createIncident(ehsOfficer);
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Under Investigation' });
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({
        status: 'Action Required',
        investigationSummary: 'Root cause found; corrective action required.',
      });

      const caRes = await withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
        title: `${siteA} CA from incident`,
        description: 'Phase 6 test.',
        workplace: siteA,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Medium',
        assignedTo: ehsOfficer.name,
        dueDate: '2099-01-01',
        createdBy: ehsOfficer.name,
        incidentId: incident.id,
        // Matches the existing pattern for every other source type (hazardReferenceNumber,
        // findingReferenceNumber, ...) — the denormalized reference string is supplied by
        // the caller (the real client already holds it from the source record it linked
        // from), not independently re-resolved server-side.
        incidentReferenceNumber: incident.referenceNumber,
        evidence: [{ fileName: 'evidence.png', fileSize: PNG_BYTES, mimeType: 'image/png', dataUrl: PNG_DATA_URL }],
      });
      expect(caRes.status).toBe(201);
      expect(caRes.body.data.sourceType).toBe('Incident');
      expect(caRes.body.data.incidentReferenceNumber).toBe(incident.referenceNumber);
      const actionId = caRes.body.data.id;

      const resolved = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Resolved' });
      expect(resolved.status).toBe(200);

      const blockedClose = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Closed' });
      expect(blockedClose.status).toBe(400);
      expect(blockedClose.body.error.message).toMatch(/corrective action/i);

      const verify = await withOrigin(ehsOfficer.agent.patch(`/api/corrective-actions/${actionId}`)).send({
        status: 'Verified',
        verifiedBy: ehsOfficer.name,
        actor: ehsOfficer.name,
      });
      expect(verify.status).toBe(200);

      const close = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Closed' });
      expect(close.status).toBe(200);
      expect(close.body.data.status).toBe('Closed');
      expect(close.body.data.activity.filter((a: { type: string }) => a.type === 'corrective_action_created')).toHaveLength(1);
    }, 60000);

    it('requires EHS Officer/Admin to reopen a Closed incident', async () => {
      const incident = await createIncident(ehsOfficer);
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Under Investigation' });
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({
        status: 'Resolved',
        investigationSummary: 'No corrective action required.',
      });
      const closed = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Closed' });
      expect(closed.status).toBe(200);

      const supervisorReopen = await withOrigin(supervisor.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Resolved' });
      expect(supervisorReopen.status).toBe(403);

      const ehsReopen = await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Resolved' });
      expect(ehsReopen.status).toBe(200);
      expect(ehsReopen.body.data.status).toBe('Resolved');
    }, 30000);
  });

  describe('Filters and pagination', () => {
    it('paginates, filters by eventType/category/status/severity/highPotential/department/investigator/date range, and totals reflect the filtered population', async () => {
      const filterWorkplace = testWorkplaceName('P6Filter');
      const filterUser = await createAndLoginUser(app, {
        name: 'P6 Filter User',
        role: 'EHS Officer',
        workplace: filterWorkplace,
        emailLabel: 'p6filter',
      });

      for (let i = 0; i < 5; i += 1) {
        await createIncident(filterUser, {
          eventType: 'Incident',
          category: 'Equipment',
          title: `${filterWorkplace} filter incident ${i}`,
          department: 'Ops',
          potentialSeverity: 'Medium',
        });
      }
      const nearMiss = await createIncident(filterUser, {
        eventType: 'NearMiss',
        category: 'Fire',
        title: `${filterWorkplace} near miss`,
        department: 'Maintenance',
        potentialSeverity: 'Critical',
      });
      await withOrigin(filterUser.agent.patch(`/api/incidents/${nearMiss.id}`)).send({ leadInvestigator: filterUser.name });

      const page1 = await withOrigin(filterUser.agent.get(`/api/incidents?page=1&pageSize=3`));
      expect(page1.status).toBe(200);
      expect(page1.body.data).toHaveLength(3);
      expect(page1.body.meta.total).toBe(6);
      expect(page1.body.meta.totalPages).toBe(2);

      const byEventType = await withOrigin(filterUser.agent.get('/api/incidents?eventType=NearMiss'));
      expect(byEventType.body.data.every((i: { eventType: string }) => i.eventType === 'NearMiss')).toBe(true);
      expect(byEventType.body.data).toHaveLength(1);

      const byCategory = await withOrigin(filterUser.agent.get('/api/incidents?category=Fire'));
      expect(byCategory.body.data).toHaveLength(1);
      expect(byCategory.body.data[0].category).toBe('Fire');

      const byStatus = await withOrigin(filterUser.agent.get('/api/incidents?status=Reported'));
      expect(byStatus.body.data).toHaveLength(6);

      const bySeverity = await withOrigin(filterUser.agent.get('/api/incidents?severity=Critical'));
      expect(bySeverity.body.data).toHaveLength(1);

      const byHighPotential = await withOrigin(filterUser.agent.get('/api/incidents?highPotential=true'));
      expect(byHighPotential.body.data).toHaveLength(1);
      expect(byHighPotential.body.data[0].potentialSeverity).toBe('Critical');

      const byDepartment = await withOrigin(filterUser.agent.get('/api/incidents?department=Maintenance'));
      expect(byDepartment.body.data).toHaveLength(1);

      const byInvestigator = await withOrigin(filterUser.agent.get('/api/incidents?investigator=me'));
      expect(byInvestigator.body.data).toHaveLength(1);
      expect(byInvestigator.body.data[0].id).toBe(nearMiss.id);

      const byDateRange = await withOrigin(
        filterUser.agent.get('/api/incidents?from=2026-08-01T00%3A00%3A00.000Z&to=2026-08-21T00%3A00%3A00.000Z'),
      );
      expect(byDateRange.body.data).toHaveLength(6);
      const outsideRange = await withOrigin(
        filterUser.agent.get('/api/incidents?from=2027-01-01T00%3A00%3A00.000Z&to=2027-02-01T00%3A00%3A00.000Z'),
      );
      expect(outsideRange.body.data).toHaveLength(0);

      const combined = await withOrigin(filterUser.agent.get('/api/incidents?eventType=NearMiss&category=Fire&pageSize=50'));
      expect(combined.body.meta.total).toBe(1);

      const bySearch = await withOrigin(filterUser.agent.get(`/api/incidents?search=${encodeURIComponent(nearMiss.referenceNumber)}`));
      expect(bySearch.body.data).toHaveLength(1);
      expect(bySearch.body.data[0].id).toBe(nearMiss.id);

      const bySearchNoMatch = await withOrigin(filterUser.agent.get('/api/incidents?search=no-such-reference-exists'));
      expect(bySearchNoMatch.body.data).toHaveLength(0);
    }, 60000);

    it('still enforces workplace scoping when paginated', async () => {
      const res = await withOrigin(userB.agent.get('/api/incidents?page=1&pageSize=50'));
      expect(res.status).toBe(200);
      expect(res.body.data.every((i: { workplace: string }) => i.workplace === siteB)).toBe(true);
    });

    it('lets Admin filter by an explicit workplace query param, but ignores it for a scoped role', async () => {
      const adminRes = await withOrigin(admin.agent.get(`/api/incidents?workplace=${encodeURIComponent(siteB)}&pageSize=50`));
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.length).toBeGreaterThan(0);
      expect(adminRes.body.data.every((i: { workplace: string }) => i.workplace === siteB)).toBe(true);

      // A scoped (non-org-wide) role's own workplace always wins over a client-supplied
      // `workplace` query param — see incidents/controller.ts's `scopeWhere ?? requestedWorkplace`.
      const scopedRes = await withOrigin(ehsOfficer.agent.get(`/api/incidents?workplace=${encodeURIComponent(siteB)}&pageSize=50`));
      expect(scopedRes.status).toBe(200);
      expect(scopedRes.body.data.length).toBeGreaterThan(0);
      expect(scopedRes.body.data.every((i: { workplace: string }) => i.workplace === siteA)).toBe(true);
    });
  });

  describe('Relationships', () => {
    async function createHazard(creator: TestUser, workplace: string) {
      const res = await withOrigin(creator.agent.post('/api/hazards')).send({
        title: `${workplace} hazard for incident link`,
        description: 'Phase 6 test hazard.',
        reportType: 'Unsafe Condition',
        hazardCategory: 'Other',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        peopleAtRisk: 'Test staff',
        riskLevel: 'Medium',
        reportedBy: creator.name,
        assignedTo: creator.name,
      });
      expect(res.status).toBe(201);
      return res.body.data;
    }

    it('links an existing Hazard at the same workplace', async () => {
      const hazard = await createHazard(ehsOfficer, siteA);
      const incident = await createIncident(ehsOfficer, { hazardId: hazard.id });
      expect(incident.hazardId).toBe(hazard.id);
      expect(incident.hazardReferenceNumber).toBe(hazard.referenceNumber);
    });

    it('rejects linking a Hazard from a different workplace', async () => {
      const hazardAtB = await createHazard(userB, siteB);
      const res = await withOrigin(ehsOfficer.agent.post('/api/incidents')).send(
        baseIncidentPayload(ehsOfficer, { hazardId: hazardAtB.id }),
      );
      expect(res.status).toBe(400);
    });

    it('supports multiple Corrective Actions linked to one Incident', async () => {
      const incident = await createIncident(ehsOfficer);
      for (let i = 0; i < 2; i += 1) {
        const res = await withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
          title: `${siteA} CA ${i} from incident`,
          description: 'Phase 6 multi-action test.',
          workplace: siteA,
          department: 'Test dept',
          location: 'Test location',
          priority: 'Medium',
          assignedTo: ehsOfficer.name,
          dueDate: '2099-01-01',
          createdBy: ehsOfficer.name,
          incidentId: incident.id,
        });
        expect(res.status).toBe(201);
      }

      const linked = await withOrigin(ehsOfficer.agent.get(`/api/corrective-actions?incidentId=${incident.id}`));
      expect(linked.status).toBe(200);
      expect(linked.body.data).toHaveLength(2);
    });

    it('rejects linking a Corrective Action to an Incident at a different workplace', async () => {
      const incidentAtB = await createIncident(userB);
      const res = await withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
        title: `${siteA} CA cross-workplace incident link`,
        description: 'Phase 6 cross-workplace test.',
        workplace: siteA,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Medium',
        assignedTo: ehsOfficer.name,
        dueDate: '2099-01-01',
        createdBy: ehsOfficer.name,
        incidentId: incidentAtB.id,
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Evidence hardening (reuses the Phase 5 shared validator)', () => {
    it('accepts valid evidence', async () => {
      const incident = await createIncident(ehsOfficer, {
        evidence: [{ fileName: 'photo.png', fileSize: PNG_BYTES, mimeType: 'image/png', dataUrl: PNG_DATA_URL }],
      });
      expect(incident.evidence).toHaveLength(1);
      expect(incident.evidence[0].fileSize).toBe(PNG_BYTES);
    });

    it('rejects a spoofed fileSize hiding an oversized actual payload', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/incidents')).send(
        baseIncidentPayload(ehsOfficer, {
          evidence: [{ fileName: 'huge.png', fileSize: 100, mimeType: 'image/png', dataUrl: oversizedPngDataUrl(16 * 1024 * 1024) }],
        }),
      );
      expect(res.status).toBe(400);
    }, 30000);

    it('rejects an unsupported MIME type', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/incidents')).send(
        baseIncidentPayload(ehsOfficer, {
          evidence: [{ fileName: 'script.svg', fileSize: 10, mimeType: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }],
        }),
      );
      expect(res.status).toBe(400);
    });

    it('rejects a MIME/signature mismatch', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/incidents')).send(
        baseIncidentPayload(ehsOfficer, {
          evidence: [{ fileName: 'fake.png', fileSize: 4, mimeType: 'image/png', dataUrl: JPEG_BYTES_AS_PNG_DATA_URL }],
        }),
      );
      expect(res.status).toBe(400);
    });

    it('rejects invalid base64', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/incidents')).send(
        baseIncidentPayload(ehsOfficer, {
          evidence: [{ fileName: 'broken.png', fileSize: 8, mimeType: 'image/png', dataUrl: 'data:image/png;base64,not-valid-base64!!!' }],
        }),
      );
      expect(res.status).toBe(400);
    });

    it('rejects zero-byte evidence', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/incidents')).send(
        baseIncidentPayload(ehsOfficer, {
          evidence: [{ fileName: 'empty.png', fileSize: 0, mimeType: 'image/png', dataUrl: 'data:image/png;base64,' }],
        }),
      );
      expect(res.status).toBe(400);
    });

    it('rejects a multi-file evidence set that individually fits under maxBytes but exceeds the aggregate 20 MB cap', async () => {
      // Each file is 8 MB (well under the 15 MB per-item cap for Incidents), but three of
      // them total 24 MB, over the shared MAX_AGGREGATE_EVIDENCE_BYTES cap
      // (server/src/lib/evidence.ts) — Phase 7 hardening, since the per-item x maxItems
      // ceiling (150 MB) otherwise exceeds what Express's 50MB JSON body limit will even
      // accept. 24 MB decoded re-encodes to ~32 MB of base64, safely under that transport
      // limit, so this exercises the aggregate check itself rather than body-parser's 413.
      const eightMb = 8 * 1024 * 1024;
      const res = await withOrigin(ehsOfficer.agent.post('/api/incidents')).send(
        baseIncidentPayload(ehsOfficer, {
          evidence: [
            { fileName: 'a.png', fileSize: eightMb, mimeType: 'image/png', dataUrl: oversizedPngDataUrl(eightMb) },
            { fileName: 'b.png', fileSize: eightMb, mimeType: 'image/png', dataUrl: oversizedPngDataUrl(eightMb) },
            { fileName: 'c.png', fileSize: eightMb, mimeType: 'image/png', dataUrl: oversizedPngDataUrl(eightMb) },
          ],
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.details.evidence).toMatch(/total evidence limit/i);
    }, 30000);

    it('accepts evidence added after creation via the dedicated endpoint', async () => {
      const incident = await createIncident(ehsOfficer);
      const res = await withOrigin(ehsOfficer.agent.post(`/api/incidents/${incident.id}/evidence`)).send({
        uploadedBy: ehsOfficer.name,
        files: [{ fileName: 'photo.png', fileSize: PNG_BYTES, mimeType: 'image/png', dataUrl: PNG_DATA_URL }],
      });
      expect(res.status).toBe(201);
    });
  });

  describe('Activity trail', () => {
    it('logs created, updated, status_change, investigator_assigned, evidence_added, and comment', async () => {
      const incident = await createIncident(ehsOfficer);
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ leadInvestigator: ehsOfficer.name });
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Under Investigation' });
      await withOrigin(ehsOfficer.agent.post(`/api/incidents/${incident.id}/evidence`)).send({
        uploadedBy: ehsOfficer.name,
        files: [{ fileName: 'photo.png', fileSize: PNG_BYTES, mimeType: 'image/png', dataUrl: PNG_DATA_URL }],
      });
      await withOrigin(ehsOfficer.agent.post(`/api/incidents/${incident.id}/comments`)).send({ author: ehsOfficer.name, message: 'A note.' });

      const detail = await withOrigin(ehsOfficer.agent.get(`/api/incidents/${incident.id}`));
      const types = detail.body.data.activity.map((a: { type: string }) => a.type);
      expect(types).toEqual(
        expect.arrayContaining(['created', 'investigator_assigned', 'status_change', 'evidence_added', 'comment']),
      );
    }, 30000);
  });

  describe('Notifications', () => {
    it('notifies the assigned investigator, and does not notify when the same user assigns themselves', async () => {
      const incident = await createIncident(ehsOfficer);
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ leadInvestigator: supervisor.name });

      const notifications = await notificationsFor(supervisor);
      const match = notifications.find((n) => n.relatedEntityId === incident.id && n.type === 'incident_investigator_assigned');
      expect(match).toBeTruthy();
      expect(match!.recipientId).toBe(supervisor.id);
    });

    it('escalates a High/Critical potential-severity report to EHS/Supervisor, but not a Low one', async () => {
      const critical = await createIncident(ehsOfficer, { potentialSeverity: 'Critical' });
      const supervisorNotifications = await notificationsFor(supervisor);
      expect(
        supervisorNotifications.some((n) => n.relatedEntityId === critical.id && n.type === 'incident_reported'),
      ).toBe(true);

      const low = await createIncident(ehsOfficer, { potentialSeverity: 'Low' });
      const supervisorNotificationsAfter = await notificationsFor(supervisor);
      expect(supervisorNotificationsAfter.some((n) => n.relatedEntityId === low.id)).toBe(false);
    });

    it('does not duplicate the investigator-assignment notification for a single assignment', async () => {
      const incident = await createIncident(ehsOfficer);
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ leadInvestigator: supervisor.name });
      const notifications = await notificationsFor(supervisor);
      const matches = notifications.filter((n) => n.relatedEntityId === incident.id && n.type === 'incident_investigator_assigned');
      expect(matches).toHaveLength(1);
    });
  });

  describe('My Actions', () => {
    it('shows the incident to its assigned lead investigator, not to an unrelated user, and removes it once Closed', async () => {
      const incident = await createIncident(ehsOfficer);
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ leadInvestigator: supervisor.name });

      const supervisorActions = await withOrigin(supervisor.agent.get('/api/my-actions'));
      expect(supervisorActions.body.data.items.some((i: { id: string }) => i.id === incident.id)).toBe(true);

      const ehsActions = await withOrigin(ehsOfficer.agent.get('/api/my-actions'));
      expect(ehsActions.body.data.items.some((i: { id: string }) => i.id === incident.id)).toBe(false);

      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Under Investigation' });
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({
        status: 'Resolved',
        investigationSummary: 'No action required.',
      });
      await withOrigin(ehsOfficer.agent.patch(`/api/incidents/${incident.id}`)).send({ status: 'Closed' });

      const afterClose = await withOrigin(supervisor.agent.get('/api/my-actions'));
      expect(afterClose.body.data.items.some((i: { id: string }) => i.id === incident.id)).toBe(false);
      // 7 sequential requests against the real test database — same class of
      // sequential-HTTP-overhead timeout seen in earlier phases' heavier tests.
    }, 60000);
  });

  describe('Dashboard', () => {
    it('Open Incidents count matches its deep-linked list total', async () => {
      const dashWorkplace = testWorkplaceName('P6Dash');
      const dashUser = await createAndLoginUser(app, { name: 'P6 Dash User', role: 'EHS Officer', workplace: dashWorkplace, emailLabel: 'p6dash' });
      await createIncident(dashUser);
      await createIncident(dashUser);

      const dashboard = await withOrigin(dashUser.agent.get('/api/dashboard/summary'));
      expect(dashboard.status).toBe(200);
      const count = dashboard.body.data.openIncidents;
      expect(count).toBeGreaterThanOrEqual(2);

      const list = await withOrigin(dashUser.agent.get('/api/incidents?openOnly=true&pageSize=100'));
      expect(list.body.meta.total).toBe(count);
    });

    it('High-Potential Events count matches its deep-linked list total', async () => {
      const dashWorkplace = testWorkplaceName('P6DashHP');
      const dashUser = await createAndLoginUser(app, { name: 'P6 DashHP User', role: 'EHS Officer', workplace: dashWorkplace, emailLabel: 'p6dashhp' });
      await createIncident(dashUser, { potentialSeverity: 'Critical' });
      await createIncident(dashUser, { potentialSeverity: 'High' });
      await createIncident(dashUser, { potentialSeverity: 'Low' });

      const dashboard = await withOrigin(dashUser.agent.get('/api/dashboard/summary'));
      const count = dashboard.body.data.highPotentialEvents;
      expect(count).toBe(2);

      const list = await withOrigin(dashUser.agent.get('/api/incidents?openOnly=true&highPotential=true&pageSize=100'));
      expect(list.body.meta.total).toBe(count);
      expect(list.body.data.every((i: { potentialSeverity: string }) => i.potentialSeverity === 'Critical' || i.potentialSeverity === 'High')).toBe(
        true,
      );
    });

    it('Near Misses This Month count matches its deep-linked, date-filtered list total', async () => {
      const dashWorkplace = testWorkplaceName('P6DashNM');
      const dashUser = await createAndLoginUser(app, { name: 'P6 DashNM User', role: 'EHS Officer', workplace: dashWorkplace, emailLabel: 'p6dashnm' });
      await createIncident(dashUser, { eventType: 'NearMiss', eventDate: new Date().toISOString() });
      await createIncident(dashUser, { eventType: 'Incident', eventDate: new Date().toISOString() });

      const dashboard = await withOrigin(dashUser.agent.get('/api/dashboard/summary'));
      const { nearMissesThisMonth, thisMonthStart, thisMonthEnd } = dashboard.body.data;
      expect(nearMissesThisMonth).toBeGreaterThanOrEqual(1);

      const list = await withOrigin(
        dashUser.agent.get(
          `/api/incidents?eventType=NearMiss&from=${encodeURIComponent(thisMonthStart)}&to=${encodeURIComponent(thisMonthEnd)}&pageSize=100`,
        ),
      );
      expect(list.body.meta.total).toBe(nearMissesThisMonth);
    });
  });

  describe('Report data authorization', () => {
    it('the unpaginated (Reports-style) list call respects workplace scoping', async () => {
      const res = await withOrigin(userB.agent.get('/api/incidents'));
      expect(res.status).toBe(200);
      expect(res.body.meta).toBeUndefined();
      expect(res.body.data.every((i: { workplace: string }) => i.workplace === siteB)).toBe(true);
    });
  });

  describe('Legacy Hazard Near Miss compatibility', () => {
    it('a historical Hazard record with reportType="Near Miss" remains readable', async () => {
      const legacyWorkplace = testWorkplaceName('P6Legacy');
      const legacyUser = await createAndLoginUser(app, {
        name: 'P6 Legacy User',
        role: 'EHS Officer',
        workplace: legacyWorkplace,
        emailLabel: 'p6legacy',
      });

      // Inserted directly (bypassing validateCreateHazard) to simulate a pre-Phase-6 row —
      // the API itself can no longer produce reportType='Near Miss' going forward.
      const now = new Date();
      const legacyHazard = await prisma.hazardReport.create({
        data: {
          referenceNumber: `HZ-LEGACY-${Date.now()}`,
          title: `${legacyWorkplace} legacy near miss hazard`,
          description: 'Pre-Phase-6 near miss hazard record.',
          reportType: 'Near Miss',
          hazardCategory: 'Other',
          workplace: legacyWorkplace,
          department: 'Test dept',
          location: 'Test location',
          peopleAtRisk: 'Test staff',
          immediateActionTaken: '',
          riskLevel: 'Medium',
          status: 'New',
          reportedBy: legacyUser.name,
          assignedTo: legacyUser.name,
          reportedAt: now,
          updatedAt: now,
        },
      });

      const res = await withOrigin(legacyUser.agent.get(`/api/hazards/${legacyHazard.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.reportType).toBe('Near Miss');
    });

    it('the API rejects reportType="Near Miss" on a newly created or updated hazard', async () => {
      const createRes = await withOrigin(ehsOfficer.agent.post('/api/hazards')).send({
        title: `${siteA} new near miss attempt`,
        description: 'Should be rejected.',
        reportType: 'Near Miss',
        hazardCategory: 'Other',
        workplace: siteA,
        department: 'Test dept',
        location: 'Test location',
        peopleAtRisk: 'Test staff',
        riskLevel: 'Medium',
        reportedBy: ehsOfficer.name,
        assignedTo: ehsOfficer.name,
      });
      expect(createRes.status).toBe(400);

      const validRes = await withOrigin(ehsOfficer.agent.post('/api/hazards')).send({
        title: `${siteA} valid hazard for update-reject test`,
        description: 'Valid.',
        reportType: 'Unsafe Condition',
        hazardCategory: 'Other',
        workplace: siteA,
        department: 'Test dept',
        location: 'Test location',
        peopleAtRisk: 'Test staff',
        riskLevel: 'Medium',
        reportedBy: ehsOfficer.name,
        assignedTo: ehsOfficer.name,
      });
      expect(validRes.status).toBe(201);

      const updateRes = await withOrigin(ehsOfficer.agent.patch(`/api/hazards/${validRes.body.data.id}`)).send({
        reportType: 'Near Miss',
      });
      expect(updateRes.status).toBe(400);
    });
  });
});

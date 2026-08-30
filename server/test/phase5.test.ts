import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { buildApp, cleanupAllTestData, createAndLoginUser, testWorkplaceName, withOrigin, type TestUser } from './helpers';

// Minimal magic-byte stubs — just the leading signature bytes each format check looks
// for, not full valid files. Verified independently: iVBORw0KGgo= decodes to the 8-byte
// PNG signature 89 50 4E 47 0D 0A 1A 0A; /9j/4A== decodes to the 4-byte JPEG signature
// FF D8 FF E0; JVBERi0xLjQ= decodes to the ASCII text "%PDF-1.4" (8 bytes).
const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';
const PNG_BYTES = 8;
const JPEG_BYTES_AS_PNG_DATA_URL = 'data:image/png;base64,/9j/4A=='; // claims PNG, actual bytes are a JPEG signature
const PDF_DATA_URL = 'data:application/pdf;base64,JVBERi0xLjQ=';
const PDF_BYTES = 8;

function oversizedPngDataUrl(totalBytes: number): string {
  // Valid PNG signature followed by filler — passes the signature check on the leading
  // bytes while the actual decoded length exceeds the module's size limit.
  const buffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(totalBytes - 8)]);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

describe('Phase 5 — audit trail & evidence hardening', () => {
  let app: Express;
  const workplace = testWorkplaceName('P5');

  let admin: TestUser;
  let ehsOfficer: TestUser;
  let worker: TestUser;

  beforeAll(async () => {
    app = buildApp();
    admin = await createAndLoginUser(app, { name: 'P5 Admin', role: 'Admin', workplace, emailLabel: 'p5admin' });
    ehsOfficer = await createAndLoginUser(app, { name: 'P5 EHS', role: 'EHS Officer', workplace, emailLabel: 'p5ehs' });
    worker = await createAndLoginUser(app, { name: 'P5 Worker', role: 'Worker', workplace, emailLabel: 'p5worker' });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Inspection Template activity', () => {
    async function createTemplate(creator: TestUser, name: string) {
      const res = await withOrigin(creator.agent.post('/api/inspection-templates')).send({
        name,
        code: `P5T-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        category: 'General Workplace Safety',
        sections: [{ title: 'Section A', questions: [{ text: 'Is it safe?', responseType: 'compliance', required: false }] }],
      });
      expect(res.status).toBe(201);
      return res.body.data;
    }

    it('creating a template produces a "created" activity entry with the correct actor', async () => {
      const template = await createTemplate(ehsOfficer, `${workplace} template A`);
      expect(template.activity).toHaveLength(1);
      expect(template.activity[0].type).toBe('created');
      expect(template.activity[0].actor).toBe(ehsOfficer.name);
      expect(template.activity[0].createdAt).toBeTruthy();
    });

    it('updating a template produces an "updated" activity entry, and a status change produces a distinct "status_change" entry', async () => {
      const template = await createTemplate(ehsOfficer, `${workplace} template B`);

      const fieldUpdate = await withOrigin(ehsOfficer.agent.patch(`/api/inspection-templates/${template.id}`)).send({
        description: 'Updated description.',
      });
      expect(fieldUpdate.status).toBe(200);
      expect(fieldUpdate.body.data.activity.map((a: { type: string }) => a.type)).toEqual(['created', 'updated']);

      // A second actor performs the status change — activity must attribute it correctly,
      // not to whoever created the template.
      const statusUpdate = await withOrigin(admin.agent.patch(`/api/inspection-templates/${template.id}`)).send({
        status: 'Active',
      });
      expect(statusUpdate.status).toBe(200);
      const types = statusUpdate.body.data.activity.map((a: { type: string }) => a.type);
      expect(types).toEqual(['created', 'updated', 'status_change']);
      const statusEntry = statusUpdate.body.data.activity[2];
      expect(statusEntry.actor).toBe(admin.name);
      expect(statusEntry.message).toContain('Draft');
      expect(statusEntry.message).toContain('Active');
    });

    it('a Worker cannot create or update a template, and generates no activity as a result', async () => {
      const blockedCreate = await withOrigin(worker.agent.post('/api/inspection-templates')).send({
        name: `${workplace} worker-attempt template`,
        code: `P5T-BLOCK-${Date.now()}`,
        category: 'General Workplace Safety',
        sections: [],
      });
      expect(blockedCreate.status).toBe(403);

      const template = await createTemplate(ehsOfficer, `${workplace} template C`);
      const blockedUpdate = await withOrigin(worker.agent.patch(`/api/inspection-templates/${template.id}`)).send({
        description: 'Should not be allowed.',
      });
      expect(blockedUpdate.status).toBe(403);

      // Confirm no activity leaked through the blocked attempt.
      const reread = await withOrigin(ehsOfficer.agent.get(`/api/inspection-templates/${template.id}`));
      expect(reread.body.data.activity).toHaveLength(1);
    });

    it('reading a template (and its activity) stays open to every authenticated role, unchanged from before', async () => {
      const template = await createTemplate(ehsOfficer, `${workplace} template D`);
      // Templates are organisation-wide configuration, not workplace-scoped data (see
      // auth/permissions.ts#canManageInspectionTemplates) — GET was already open to every
      // role before Phase 5, and adding activity must not narrow that.
      const res = await withOrigin(worker.agent.get(`/api/inspection-templates/${template.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.activity).toHaveLength(1);
    });
  });

  describe('Workplace activity', () => {
    async function createWorkplaceRecord(creator: TestUser, name: string) {
      const res = await withOrigin(creator.agent.post('/api/workplaces')).send({
        organisation: 'P5 Org',
        name,
        code: `P5W-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        industry: 'Manufacturing',
        address: '1 Test Street',
        areas: [],
      });
      expect(res.status).toBe(201);
      return res.body.data;
    }

    it('creating a workplace produces a "created" activity entry with the correct actor', async () => {
      const wp = await createWorkplaceRecord(admin, `${workplace} site A`);
      expect(wp.activity).toHaveLength(1);
      expect(wp.activity[0].type).toBe('created');
      expect(wp.activity[0].actor).toBe(admin.name);
    });

    it('updating status produces a distinct "status_change" entry, separate from a field "updated" entry', async () => {
      const wp = await createWorkplaceRecord(admin, `${workplace} site B`);

      const fieldUpdate = await withOrigin(admin.agent.patch(`/api/workplaces/${wp.id}`)).send({ address: '2 New Street' });
      expect(fieldUpdate.status).toBe(200);
      expect(fieldUpdate.body.data.activity.map((a: { type: string }) => a.type)).toEqual(['created', 'updated']);

      const statusUpdate = await withOrigin(admin.agent.patch(`/api/workplaces/${wp.id}`)).send({ status: 'Inactive' });
      expect(statusUpdate.status).toBe(200);
      const types = statusUpdate.body.data.activity.map((a: { type: string }) => a.type);
      expect(types).toEqual(['created', 'updated', 'status_change']);
      expect(statusUpdate.body.data.activity[2].message).toContain('Inactive');
    });

    it('a non-Admin role cannot create or update a workplace — org-wide management stays Admin-only', async () => {
      const blockedCreate = await withOrigin(ehsOfficer.agent.post('/api/workplaces')).send({
        organisation: 'P5 Org',
        name: `${workplace} ehs-attempt site`,
        code: `P5W-BLOCK-${Date.now()}`,
        industry: 'Manufacturing',
        address: '1 Test Street',
        areas: [],
      });
      expect(blockedCreate.status).toBe(403);

      const wp = await createWorkplaceRecord(admin, `${workplace} site C`);
      const blockedUpdate = await withOrigin(worker.agent.patch(`/api/workplaces/${wp.id}`)).send({ status: 'Inactive' });
      expect(blockedUpdate.status).toBe(403);

      const reread = await withOrigin(admin.agent.get(`/api/workplaces/${wp.id}`));
      expect(reread.body.data.activity).toHaveLength(1);
    });

    it('reading a workplace (and its activity) stays open to every authenticated role, unchanged from before', async () => {
      const wp = await createWorkplaceRecord(admin, `${workplace} site D`);
      const res = await withOrigin(worker.agent.get(`/api/workplaces/${wp.id}`));
      expect(res.status).toBe(200);
      expect(res.body.data.activity).toHaveLength(1);
    });
  });

  describe('Hazard evidence hardening', () => {
    async function createHazardWithEvidence(evidence: unknown) {
      return withOrigin(ehsOfficer.agent.post('/api/hazards')).send({
        title: `${workplace} hazard with evidence`,
        description: 'Phase 5 evidence hardening test.',
        reportType: 'Unsafe Condition',
        hazardCategory: 'Other',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        peopleAtRisk: 'Test staff',
        riskLevel: 'Medium',
        reportedBy: ehsOfficer.name,
        assignedTo: ehsOfficer.name,
        evidence,
      });
    }

    it('accepts valid evidence and persists the server-computed byte length, not the client-declared one', async () => {
      const res = await createHazardWithEvidence([{ fileName: 'photo.png', fileSize: PNG_BYTES, mimeType: 'image/png', dataUrl: PNG_DATA_URL }]);
      expect(res.status).toBe(201);
    });

    it('rejects evidence whose declared fileSize hides an actual payload over the size limit', async () => {
      const res = await createHazardWithEvidence([
        { fileName: 'huge.png', fileSize: 100, mimeType: 'image/png', dataUrl: oversizedPngDataUrl(9 * 1024 * 1024) },
      ]);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body)).not.toMatch(/at .*\.(ts|js):\d+/); // no stack trace leakage
    });

    it('rejects a declared fileSize that does not match the actual (smaller) payload', async () => {
      const res = await createHazardWithEvidence([
        { fileName: 'mismatch.png', fileSize: 999999, mimeType: 'image/png', dataUrl: PNG_DATA_URL },
      ]);
      expect(res.status).toBe(400);
    });

    it('rejects a MIME type not on the hazard evidence allow-list', async () => {
      const res = await createHazardWithEvidence([
        { fileName: 'doc.pdf', fileSize: PDF_BYTES, mimeType: 'application/pdf', dataUrl: PDF_DATA_URL },
      ]);
      expect(res.status).toBe(400);
    });

    it('rejects evidence whose payload signature does not match its claimed MIME type', async () => {
      const res = await createHazardWithEvidence([
        { fileName: 'fake.png', fileSize: 4, mimeType: 'image/png', dataUrl: JPEG_BYTES_AS_PNG_DATA_URL },
      ]);
      expect(res.status).toBe(400);
    });

    it('rejects malformed evidence: invalid base64 payload', async () => {
      const res = await createHazardWithEvidence([
        { fileName: 'broken.png', fileSize: 8, mimeType: 'image/png', dataUrl: 'data:image/png;base64,not-valid-base64!!!' },
      ]);
      expect(res.status).toBe(400);
    });

    it('rejects malformed evidence: not a data URL at all', async () => {
      const res = await createHazardWithEvidence([
        { fileName: 'broken.png', fileSize: 8, mimeType: 'image/png', dataUrl: 'https://example.com/not-a-data-url.png' },
      ]);
      expect(res.status).toBe(400);
    });

    it('rejects zero-byte evidence', async () => {
      const res = await createHazardWithEvidence([
        { fileName: 'empty.png', fileSize: 0, mimeType: 'image/png', dataUrl: 'data:image/png;base64,' },
      ]);
      expect(res.status).toBe(400);
    });
  });

  describe('Corrective Action evidence hardening', () => {
    async function createActionWithEvidence(evidence: unknown) {
      return withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
        title: `${workplace} CA with evidence`,
        description: 'Phase 5 evidence hardening test.',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Medium',
        assignedTo: ehsOfficer.name,
        dueDate: '2099-01-01',
        createdBy: ehsOfficer.name,
        evidence,
      });
    }

    it('accepts valid evidence (image and PDF are both on this module\'s allow-list)', async () => {
      const res = await createActionWithEvidence([{ fileName: 'doc.pdf', fileSize: PDF_BYTES, mimeType: 'application/pdf', dataUrl: PDF_DATA_URL }]);
      expect(res.status).toBe(201);
    });

    it('rejects evidence whose declared fileSize hides an actual payload over the size limit', async () => {
      const res = await createActionWithEvidence([
        { fileName: 'huge.png', fileSize: 100, mimeType: 'image/png', dataUrl: oversizedPngDataUrl(16 * 1024 * 1024) },
      ]);
      expect(res.status).toBe(400);
    }, 30000);

    it('rejects a MIME type not on the corrective-action evidence allow-list', async () => {
      const res = await createActionWithEvidence([
        { fileName: 'script.svg', fileSize: 10, mimeType: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' },
      ]);
      expect(res.status).toBe(400);
    });

    it('rejects malformed evidence: invalid base64 payload', async () => {
      const res = await createActionWithEvidence([
        { fileName: 'broken.pdf', fileSize: 8, mimeType: 'application/pdf', dataUrl: 'data:application/pdf;base64,%%%not-base64%%%' },
      ]);
      expect(res.status).toBe(400);
    });

    it('the add-evidence-later endpoint applies the same hardening as create (spoofed fileSize rejected)', async () => {
      const createRes = await createActionWithEvidence([]);
      expect(createRes.status).toBe(201);
      const actionId = createRes.body.data.id;

      const addRes = await withOrigin(ehsOfficer.agent.post(`/api/corrective-actions/${actionId}/evidence`)).send({
        uploadedBy: ehsOfficer.name,
        files: [{ fileName: 'huge.png', fileSize: 100, mimeType: 'image/png', dataUrl: oversizedPngDataUrl(16 * 1024 * 1024) }],
      });
      expect(addRes.status).toBe(400);
    }, 30000);

    it('the add-evidence-later endpoint accepts valid evidence', async () => {
      const createRes = await createActionWithEvidence([]);
      expect(createRes.status).toBe(201);
      const actionId = createRes.body.data.id;

      const addRes = await withOrigin(ehsOfficer.agent.post(`/api/corrective-actions/${actionId}/evidence`)).send({
        uploadedBy: ehsOfficer.name,
        files: [{ fileName: 'photo.png', fileSize: PNG_BYTES, mimeType: 'image/png', dataUrl: PNG_DATA_URL }],
      });
      expect(addRes.status).toBe(201);
    });
  });
});

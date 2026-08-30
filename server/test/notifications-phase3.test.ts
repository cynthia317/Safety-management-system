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
import { prisma } from '../src/lib/prisma';
import { runReminderSweep } from '../src/modules/notifications/reminders';

interface NotificationRow {
  id: string;
  type: string;
  recipient: string;
  recipientId: string | null;
  subject: string;
  relatedEntityType: string;
  relatedEntityId: string;
}

describe('Phase 3 — notification completion', () => {
  let app: Express;
  const workplace = testWorkplaceName('Phase3');
  const otherWorkplace = testWorkplaceName('Phase3Other');

  let ehsOfficer: TestUser;
  let assignee: TestUser;
  let sameNameWrongWorkplace: TestUser;

  beforeAll(async () => {
    app = buildApp();
    ehsOfficer = await createAndLoginUser(app, { name: 'Phase3 EHS', role: 'EHS Officer', workplace, emailLabel: 'ehs' });
    assignee = await createAndLoginUser(app, { name: 'Phase3 Assignee', role: 'Supervisor', workplace, emailLabel: 'assignee' });
    // Same display name as `assignee`, but at a different workplace — proves recipient
    // resolution is workplace-scoped, not just name-matched.
    sameNameWrongWorkplace = await createAndLoginUser(app, {
      name: 'Phase3 Assignee',
      role: 'Supervisor',
      workplace: otherWorkplace,
      emailLabel: 'wrongsite',
    });
  });

  afterAll(async () => {
    await prisma.notificationEvent.deleteMany({ where: { workplace: { in: [workplace, otherWorkplace] } } });
    await cleanupAllTestData();
  });

  async function notificationsFor(user: TestUser): Promise<NotificationRow[]> {
    const res = await withOrigin(user.agent.get('/api/notifications'));
    expect(res.status).toBe(200);
    return res.body.data as NotificationRow[];
  }

  describe('Hazards', () => {
    it('assigning a hazard creates a notification for the correct real user, not the same-named user at another workplace', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/hazards')).send({
        title: `${workplace} hazard for assignment`,
        description: 'Phase 3 hazard assignment test.',
        reportType: 'Unsafe Condition',
        hazardCategory: 'Other',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        peopleAtRisk: 'Test staff',
        riskLevel: 'High',
        reportedBy: ehsOfficer.name,
        assignedTo: assignee.name,
      });
      expect(res.status).toBe(201);
      const hazardId = res.body.data.id;

      const assigneeNotifications = await notificationsFor(assignee);
      const match = assigneeNotifications.find((n) => n.relatedEntityId === hazardId && n.type === 'hazard_assigned');
      expect(match).toBeTruthy();
      expect(match!.recipientId).toBe(assignee.id);
      expect(match!.relatedEntityType).toBe('hazard');

      const wrongSiteNotifications = await notificationsFor(sameNameWrongWorkplace);
      expect(wrongSiteNotifications.find((n) => n.relatedEntityId === hazardId)).toBeUndefined();
    });
  });

  describe('Findings', () => {
    it('assigning a finding creates a notification for the assigned user', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/findings')).send({
        title: `${workplace} finding for assignment`,
        description: 'Phase 3 finding assignment test.',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        riskLevel: 'Medium',
        assignedTo: assignee.name,
        dueDate: '2026-12-01',
        createdBy: ehsOfficer.name,
      });
      expect(res.status).toBe(201);

      const notifications = await notificationsFor(assignee);
      const match = notifications.find((n) => n.relatedEntityId === res.body.data.id && n.type === 'finding_assigned');
      expect(match).toBeTruthy();
      expect(match!.recipientId).toBe(assignee.id);
    });
  });

  describe('Inspections', () => {
    it('assigning an inspection creates a notification for the lead inspector', async () => {
      const res = await withOrigin(ehsOfficer.agent.post('/api/inspections')).send({
        templateId: (await createActiveTemplate()).id,
        title: `${workplace} inspection for assignment`,
        workplace,
        area: 'Test area',
        specificLocation: 'Test location',
        inspectionDate: '2026-08-20',
        leadInspector: assignee.name,
      });
      expect(res.status).toBe(201);

      const notifications = await notificationsFor(assignee);
      const match = notifications.find((n) => n.relatedEntityId === res.body.data.id && n.type === 'inspection_assigned');
      expect(match).toBeTruthy();
      expect(match!.recipientId).toBe(assignee.id);
    });

    async function createActiveTemplate() {
      const templateRes = await withOrigin(ehsOfficer.agent.post('/api/inspection-templates')).send({
        name: `${workplace} phase3 template`,
        code: `T3-${Date.now()}`,
        category: 'General Workplace Safety',
        sections: [{ title: 'Section A', questions: [{ text: 'Is it safe?', responseType: 'compliance', required: false }] }],
      });
      expect(templateRes.status).toBe(201);
      const activateRes = await withOrigin(ehsOfficer.agent.patch(`/api/inspection-templates/${templateRes.body.data.id}`)).send({
        status: 'Active',
      });
      expect(activateRes.status).toBe(200);
      return templateRes.body.data;
    }
  });

  describe('Risk Assessments', () => {
    it('submitting a risk assessment for review notifies the EHS Officer but not an unrelated worker', async () => {
      const worker = await createAndLoginUser(app, { name: 'Phase3 Worker', role: 'Worker', workplace, emailLabel: 'worker' });

      const createRes = await withOrigin(assignee.agent.post('/api/risk-assessments')).send({
        title: `${workplace} RA for review`,
        assessmentType: 'Routine',
        description: 'Phase 3 risk assessment review test.',
        workplace,
        department: 'Test dept',
        assessedBy: assignee.name,
        assessmentDate: '2026-08-20',
        items: [],
      });
      expect(createRes.status).toBe(201);
      const raId = createRes.body.data.id;

      const submitRes = await withOrigin(assignee.agent.patch(`/api/risk-assessments/${raId}`)).send({ status: 'Under Review' });
      expect(submitRes.status).toBe(200);

      const ehsNotifications = await notificationsFor(ehsOfficer);
      expect(ehsNotifications.find((n) => n.relatedEntityId === raId && n.type === 'risk_assessment_submitted_for_review')).toBeTruthy();

      const workerNotifications = await notificationsFor(worker);
      expect(workerNotifications.find((n) => n.relatedEntityId === raId)).toBeUndefined();
    });
  });

  describe('Corrective Actions', () => {
    it('resolves the old role-name recipient to real EHS Officer user(s) on verification request', async () => {
      const caRes = await withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
        title: `${workplace} CA for verification`,
        description: 'Phase 3 verification-requested test.',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Medium',
        assignedTo: assignee.name,
        dueDate: '2026-12-01',
        createdBy: ehsOfficer.name,
      });
      expect(caRes.status).toBe(201);
      const caId = caRes.body.data.id;

      const submitRes = await withOrigin(assignee.agent.patch(`/api/corrective-actions/${caId}`)).send({
        status: 'Awaiting Verification',
        responseNote: 'Fixed.',
        actor: assignee.name,
      });
      expect(submitRes.status).toBe(200);

      const ehsNotifications = await notificationsFor(ehsOfficer);
      const match = ehsNotifications.find(
        (n) => n.relatedEntityId === caId && n.type === 'corrective_action_verification_requested',
      );
      expect(match).toBeTruthy();
      // The old bug stored the literal string 'EHS Officer' as `recipient` — this asserts a
      // real user's name/id was resolved instead.
      expect(match!.recipient).toBe(ehsOfficer.name);
      expect(match!.recipientId).toBe(ehsOfficer.id);
      expect(match!.recipient).not.toBe('EHS Officer');
    });

    it('notifies the assignee when the action is verified and reopened', async () => {
      const caRes = await withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
        title: `${workplace} CA for verify/reopen`,
        description: 'Phase 3 verify/reopen test.',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Medium',
        assignedTo: assignee.name,
        dueDate: '2026-12-01',
        createdBy: ehsOfficer.name,
        // Verifying requires at least one evidence file (see correctiveActions/controller.ts).
        evidence: [{ fileName: 'evidence.png', fileSize: 5, mimeType: 'image/png', dataUrl: 'data:image/png;base64,aGVsbG8=' }],
      });
      const caId = caRes.body.data.id;

      await withOrigin(ehsOfficer.agent.patch(`/api/corrective-actions/${caId}`)).send({
        status: 'Verified',
        verifiedBy: ehsOfficer.name,
        actor: ehsOfficer.name,
      });
      const afterVerified = await notificationsFor(assignee);
      expect(afterVerified.find((n) => n.relatedEntityId === caId && n.type === 'corrective_action_verified')).toBeTruthy();

      await withOrigin(ehsOfficer.agent.patch(`/api/corrective-actions/${caId}`)).send({
        status: 'In Progress',
        actor: ehsOfficer.name,
      });
      const afterReopened = await notificationsFor(assignee);
      expect(afterReopened.find((n) => n.relatedEntityId === caId && n.type === 'corrective_action_reopened')).toBeTruthy();
    });
  });

  describe('Ownership', () => {
    it("does not let one user mark another user's notification as read", async () => {
      const caRes = await withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
        title: `${workplace} CA for ownership`,
        description: 'Phase 3 ownership test.',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Medium',
        assignedTo: assignee.name,
        dueDate: '2026-12-01',
        createdBy: ehsOfficer.name,
      });
      const notifications = await notificationsFor(assignee);
      const notification = notifications.find((n) => n.relatedEntityId === caRes.body.data.id);
      expect(notification).toBeTruthy();

      const blocked = await withOrigin(ehsOfficer.agent.post(`/api/notifications/${notification!.id}/read`));
      expect(blocked.status).toBe(403);

      const allowed = await withOrigin(assignee.agent.post(`/api/notifications/${notification!.id}/read`));
      expect(allowed.status).toBe(200);
    });
  });

  describe('Reminders', () => {
    it('generates one overdue reminder for a past-due corrective action and does not duplicate it on a repeated sweep', async () => {
      const caRes = await withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
        title: `${workplace} CA for overdue reminder`,
        description: 'Phase 3 reminder test.',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        priority: 'High',
        assignedTo: assignee.name,
        dueDate: '2020-01-01',
        createdBy: ehsOfficer.name,
      });
      const caId = caRes.body.data.id;

      // Scoped to this test's own workplace — an unscoped sweep would also walk every
      // open hazard/finding/inspection/corrective-action across the whole shared dev
      // database (see ReminderSweepOptions.workplace's own doc comment), which is both
      // unrelated to what this test verifies and, against a remote Postgres instance,
      // slow enough (one sequential round trip per row) to blow past the test timeout.
      const firstSweep = await runReminderSweep(new Date(), { workplace });
      expect(firstSweep.byType.corrective_action_overdue ?? 0).toBeGreaterThanOrEqual(1);

      const secondSweep = await runReminderSweep(new Date(), { workplace });
      expect(secondSweep.byType.corrective_action_overdue ?? 0).toBe(0);

      const notifications = await notificationsFor(assignee);
      const overdueNotifications = notifications.filter((n) => n.relatedEntityId === caId && n.type === 'corrective_action_overdue');
      expect(overdueNotifications.length).toBe(1);
    });

    it('does not generate an overdue reminder for a closed corrective action', async () => {
      const caRes = await withOrigin(ehsOfficer.agent.post('/api/corrective-actions')).send({
        title: `${workplace} CA closed, past due`,
        description: 'Phase 3 closed-record reminder test.',
        workplace,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Low',
        assignedTo: assignee.name,
        dueDate: '2020-01-01',
        createdBy: ehsOfficer.name,
        evidence: [{ fileName: 'evidence.png', fileSize: 5, mimeType: 'image/png', dataUrl: 'data:image/png;base64,aGVsbG8=' }],
      });
      const caId = caRes.body.data.id;

      await withOrigin(ehsOfficer.agent.patch(`/api/corrective-actions/${caId}`)).send({ status: 'Verified', actor: ehsOfficer.name });
      await withOrigin(ehsOfficer.agent.patch(`/api/corrective-actions/${caId}`)).send({ status: 'Closed', actor: ehsOfficer.name });

      await runReminderSweep(new Date(), { workplace });

      const notifications = await notificationsFor(assignee);
      expect(notifications.find((n) => n.relatedEntityId === caId && n.type === 'corrective_action_overdue')).toBeUndefined();
    });

    it('resolves the overdue reminder recipient by workplace, not just by name', async () => {
      // Same display name as `assignee` (at `workplace`), but this action lives at
      // `otherWorkplace` and is assigned to the same-named user there — the sweep must
      // notify that user, never `assignee`.
      // Created by sameNameWrongWorkplace (a Supervisor, who can create corrective actions)
      // rather than ehsOfficer — ehsOfficer belongs to `workplace`, not `otherWorkplace`,
      // and would be blocked by workplace-access authorization from creating a record there.
      const caRes = await withOrigin(sameNameWrongWorkplace.agent.post('/api/corrective-actions')).send({
        title: `${otherWorkplace} CA for cross-workplace name collision`,
        description: 'Phase 3 reminder workplace-scoping test.',
        workplace: otherWorkplace,
        department: 'Test dept',
        location: 'Test location',
        priority: 'Medium',
        assignedTo: sameNameWrongWorkplace.name,
        dueDate: '2020-01-01',
        createdBy: sameNameWrongWorkplace.name,
      });
      expect(caRes.status).toBe(201);
      const caId = caRes.body.data.id;

      await runReminderSweep(new Date(), { workplace: otherWorkplace });

      const correctRecipientNotifications = await notificationsFor(sameNameWrongWorkplace);
      const match = correctRecipientNotifications.find((n) => n.relatedEntityId === caId && n.type === 'corrective_action_overdue');
      expect(match).toBeTruthy();
      expect(match!.recipientId).toBe(sameNameWrongWorkplace.id);

      const wrongWorkplaceNotifications = await notificationsFor(assignee);
      expect(wrongWorkplaceNotifications.find((n) => n.relatedEntityId === caId)).toBeUndefined();
    });
  });
});

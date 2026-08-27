import { prisma } from '../../lib/prisma';
import { isDueSoon, isOverdue } from '../../lib/dueDate';
import { isHazardOverdue } from '../../lib/hazardSla';
import { resolveUserByName } from './recipients';
import { notifyUserOnce } from './service';
import type { RiskLevel as HazardRiskLevel } from '../hazards/types';

export interface ReminderSweepResult {
  checked: number;
  created: number;
  byType: Record<string, number>;
}

export interface ReminderSweepOptions {
  /** Restricts the sweep to a single workplace — used by tests so a reminder run against
   * the shared dev database can't touch real records outside its own fixtures. The
   * production scheduler endpoint always omits this, sweeping every workplace. */
  workplace?: string;
}

function recordCreated(result: ReminderSweepResult, type: string, created: boolean): void {
  if (!created) return;
  result.created += 1;
  result.byType[type] = (result.byType[type] ?? 0) + 1;
}

/**
 * Runs the full due-soon/overdue reminder sweep across every module that has a due date (or
 * an equivalent target date) and an existing product convention for what "overdue" means —
 * see server/src/lib/dueDate.ts and server/src/lib/hazardSla.ts. Idempotent: each reminder
 * uses a unique `reminderKey` (type + record + recipient), so calling this repeatedly (as a
 * scheduler naturally does) only ever creates a given reminder once. Safe to call as often
 * as desired; recipient resolution failures (no matching active user) are skipped rather
 * than thrown, so one bad record can't abort the whole sweep.
 */
export async function runReminderSweep(now: Date = new Date(), options: ReminderSweepOptions = {}): Promise<ReminderSweepResult> {
  const result: ReminderSweepResult = { checked: 0, created: 0, byType: {} };

  await sweepCorrectiveActions(result, now, options);
  await sweepFindings(result, now, options);
  await sweepInspections(result, now, options);
  await sweepHazards(result, now, options);

  return result;
}

async function sweepCorrectiveActions(result: ReminderSweepResult, now: Date, options: ReminderSweepOptions): Promise<void> {
  const rows = await prisma.correctiveAction.findMany({
    where: { status: { not: 'Closed' }, ...(options.workplace ? { workplace: options.workplace } : {}) },
    select: { id: true, referenceNumber: true, title: true, assignedTo: true, workplace: true, dueDate: true, priority: true },
  });

  for (const row of rows) {
    result.checked += 1;
    const assignee = await resolveUserByName(row.assignedTo, row.workplace);
    if (!assignee) continue;

    if (isOverdue(row.dueDate, now)) {
      const created = await notifyUserOnce(
        assignee,
        {
          type: 'corrective_action_overdue',
          subject: `Overdue: ${row.referenceNumber}`,
          message: `Corrective action ${row.referenceNumber}: "${row.title}" was due ${row.dueDate.toLocaleDateString()} and is now overdue.`,
          relatedEntityType: 'corrective_action',
          relatedEntityId: row.id,
          relatedEntityReference: row.referenceNumber,
          priority: row.priority === 'Critical' || row.priority === 'High' ? row.priority : undefined,
        },
        `corrective_action_overdue:${row.id}:${assignee.id}`,
      );
      recordCreated(result, 'corrective_action_overdue', created);
    } else if (isDueSoon(row.dueDate, now)) {
      const created = await notifyUserOnce(
        assignee,
        {
          type: 'corrective_action_due_reminder',
          subject: `Due soon: ${row.referenceNumber}`,
          message: `Corrective action ${row.referenceNumber}: "${row.title}" is due ${row.dueDate.toLocaleDateString()}.`,
          relatedEntityType: 'corrective_action',
          relatedEntityId: row.id,
          relatedEntityReference: row.referenceNumber,
        },
        `corrective_action_due_reminder:${row.id}:${assignee.id}`,
      );
      recordCreated(result, 'corrective_action_due_reminder', created);
    }
  }
}

async function sweepFindings(result: ReminderSweepResult, now: Date, options: ReminderSweepOptions): Promise<void> {
  const rows = await prisma.finding.findMany({
    where: { status: { not: 'Closed' }, ...(options.workplace ? { workplace: options.workplace } : {}) },
    select: { id: true, referenceNumber: true, title: true, assignedTo: true, workplace: true, dueDate: true, riskLevel: true },
  });

  for (const row of rows) {
    result.checked += 1;
    const assignee = await resolveUserByName(row.assignedTo, row.workplace);
    if (!assignee) continue;

    if (isOverdue(row.dueDate, now)) {
      const created = await notifyUserOnce(
        assignee,
        {
          type: 'finding_overdue',
          subject: `Overdue: ${row.referenceNumber}`,
          message: `Finding ${row.referenceNumber}: "${row.title}" was due ${row.dueDate.toLocaleDateString()} and is now overdue.`,
          relatedEntityType: 'finding',
          relatedEntityId: row.id,
          relatedEntityReference: row.referenceNumber,
          priority: row.riskLevel === 'Critical' || row.riskLevel === 'High' ? row.riskLevel : undefined,
        },
        `finding_overdue:${row.id}:${assignee.id}`,
      );
      recordCreated(result, 'finding_overdue', created);
    } else if (isDueSoon(row.dueDate, now)) {
      const created = await notifyUserOnce(
        assignee,
        {
          type: 'finding_due_reminder',
          subject: `Due soon: ${row.referenceNumber}`,
          message: `Finding ${row.referenceNumber}: "${row.title}" is due ${row.dueDate.toLocaleDateString()}.`,
          relatedEntityType: 'finding',
          relatedEntityId: row.id,
          relatedEntityReference: row.referenceNumber,
        },
        `finding_due_reminder:${row.id}:${assignee.id}`,
      );
      recordCreated(result, 'finding_due_reminder', created);
    }
  }
}

const OPEN_INSPECTION_STATUSES = ['Draft', 'In Progress'];

async function sweepInspections(result: ReminderSweepResult, now: Date, options: ReminderSweepOptions): Promise<void> {
  const rows = await prisma.inspection.findMany({
    where: { status: { in: OPEN_INSPECTION_STATUSES }, ...(options.workplace ? { workplace: options.workplace } : {}) },
    select: { id: true, referenceNumber: true, title: true, leadInspector: true, workplace: true, inspectionDate: true },
  });

  for (const row of rows) {
    result.checked += 1;
    const inspector = await resolveUserByName(row.leadInspector, row.workplace);
    if (!inspector) continue;

    if (isOverdue(row.inspectionDate, now)) {
      const created = await notifyUserOnce(
        inspector,
        {
          type: 'inspection_overdue',
          subject: `Overdue: ${row.referenceNumber}`,
          message: `Inspection ${row.referenceNumber}: "${row.title}" was scheduled for ${row.inspectionDate.toLocaleDateString()} and has not been completed.`,
          relatedEntityType: 'inspection',
          relatedEntityId: row.id,
          relatedEntityReference: row.referenceNumber,
        },
        `inspection_overdue:${row.id}:${inspector.id}`,
      );
      recordCreated(result, 'inspection_overdue', created);
    } else if (isDueSoon(row.inspectionDate, now)) {
      const created = await notifyUserOnce(
        inspector,
        {
          type: 'inspection_due_reminder',
          subject: `Due soon: ${row.referenceNumber}`,
          message: `Inspection ${row.referenceNumber}: "${row.title}" is scheduled for ${row.inspectionDate.toLocaleDateString()}.`,
          relatedEntityType: 'inspection',
          relatedEntityId: row.id,
          relatedEntityReference: row.referenceNumber,
        },
        `inspection_due_reminder:${row.id}:${inspector.id}`,
      );
      recordCreated(result, 'inspection_due_reminder', created);
    }
  }
}

// Hazards have no dueDate — overdue is derived from the existing risk-scaled SLA convention
// (see lib/hazardSla.ts, mirrored from the client's "Overdue" badge). There is no due-soon
// concept for hazards in the product today, so only the overdue reminder is implemented.
async function sweepHazards(result: ReminderSweepResult, now: Date, options: ReminderSweepOptions): Promise<void> {
  const rows = await prisma.hazardReport.findMany({
    where: { status: { in: ['New', 'Under Review', 'Action Required'] }, ...(options.workplace ? { workplace: options.workplace } : {}) },
    select: { id: true, referenceNumber: true, title: true, assignedTo: true, workplace: true, status: true, riskLevel: true, reportedAt: true },
  });

  for (const row of rows) {
    result.checked += 1;
    if (!isHazardOverdue({ status: row.status, riskLevel: row.riskLevel as HazardRiskLevel, reportedAt: row.reportedAt }, now)) continue;

    const assignee = await resolveUserByName(row.assignedTo, row.workplace);
    if (!assignee) continue;

    const created = await notifyUserOnce(
      assignee,
      {
        type: 'hazard_overdue',
        subject: `Overdue: ${row.referenceNumber}`,
        message: `Hazard ${row.referenceNumber}: "${row.title}" (${row.riskLevel} risk) is past its review SLA.`,
        relatedEntityType: 'hazard',
        relatedEntityId: row.id,
        relatedEntityReference: row.referenceNumber,
        priority: row.riskLevel === 'Critical' || row.riskLevel === 'High' ? (row.riskLevel as 'Critical' | 'High') : undefined,
      },
      `hazard_overdue:${row.id}:${assignee.id}`,
    );
    recordCreated(result, 'hazard_overdue', created);
  }
}

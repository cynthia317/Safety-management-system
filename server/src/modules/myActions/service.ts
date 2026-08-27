import { prisma } from '../../lib/prisma';
import { isDueSoon, isOverdue } from '../../lib/dueDate';
import { isHazardOverdue } from '../../lib/hazardSla';
import { OPEN_INSPECTION_STATUSES } from '../inspections/service';
import { highestRiskLevel, type RiskLevel } from '../riskAssessments/riskMatrix';
import type { RiskLevel as HazardRiskLevel } from '../hazards/types';
import type { MyActionItem, MyActionModule, MyActionPriority, MyActionsCounts, MyActionsResponse } from './types';

const RECENTLY_COMPLETED_WINDOW_DAYS = 14;
const RANK: Record<MyActionPriority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

const ROUTE_PREFIX: Record<MyActionModule, string> = {
  hazard: '/hazards',
  finding: '/findings',
  inspection: '/inspections',
  risk_assessment: '/risk-assessments',
  corrective_action: '/corrective-actions',
};

function recentlyCompleted(completedAt: Date | null, now: Date): boolean {
  if (!completedAt) return false;
  const days = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= RECENTLY_COMPLETED_WINDOW_DAYS;
}

interface AssigneeFilter {
  /** Exact (case-insensitive) match against the assignee's display name. */
  name: string;
  /** `undefined` for Admin (organisation-wide), or `{ equals, mode }` for every other role —
   * the same name-collision guard Phase 3 introduced for notification recipients
   * (notifications/recipients.ts): a same-named user at a different workplace must never
   * see another person's assigned work. */
  workplace: { equals: string; mode: 'insensitive' } | undefined;
}

async function hazardItems(assignee: AssigneeFilter, now: Date): Promise<MyActionItem[]> {
  const rows = await prisma.hazardReport.findMany({
    where: {
      assignedTo: { equals: assignee.name, mode: 'insensitive' },
      ...(assignee.workplace ? { workplace: assignee.workplace } : {}),
    },
    select: { id: true, referenceNumber: true, title: true, status: true, riskLevel: true, workplace: true, reportedAt: true, updatedAt: true },
  });

  return rows.map((r) => {
    const overdue = isHazardOverdue({ status: r.status, riskLevel: r.riskLevel as HazardRiskLevel, reportedAt: r.reportedAt }, now);
    return {
      id: r.id,
      module: 'hazard' as const,
      referenceNumber: r.referenceNumber,
      title: r.title,
      status: r.status,
      priority: r.riskLevel as MyActionPriority,
      dueDate: null,
      workplace: r.workplace,
      route: `${ROUTE_PREFIX.hazard}/${r.id}`,
      overdue,
      // Hazards have no due-soon concept (see lib/hazardSla.ts) — only overdue applies.
      dueSoon: false,
      active: r.status === 'Under Review' || r.status === 'Action Required',
      awaitingVerification: false,
      recentlyCompleted: (r.status === 'Resolved' || r.status === 'Closed') && recentlyCompleted(r.updatedAt, now),
    };
  });
}

async function findingItems(assignee: AssigneeFilter, now: Date): Promise<MyActionItem[]> {
  const rows = await prisma.finding.findMany({
    where: {
      assignedTo: { equals: assignee.name, mode: 'insensitive' },
      ...(assignee.workplace ? { workplace: assignee.workplace } : {}),
    },
    select: { id: true, referenceNumber: true, title: true, status: true, riskLevel: true, workplace: true, dueDate: true, updatedAt: true },
  });

  return rows.map((r) => {
    const overdue = r.status !== 'Closed' && isOverdue(r.dueDate, now);
    return {
      id: r.id,
      module: 'finding' as const,
      referenceNumber: r.referenceNumber,
      title: r.title,
      status: r.status,
      priority: r.riskLevel as MyActionPriority,
      dueDate: r.dueDate.toISOString(),
      workplace: r.workplace,
      route: `${ROUTE_PREFIX.finding}/${r.id}`,
      overdue,
      dueSoon: r.status !== 'Closed' && !overdue && isDueSoon(r.dueDate, now),
      active: r.status === 'In Progress',
      awaitingVerification: r.status === 'Awaiting Verification',
      recentlyCompleted: r.status === 'Closed' && recentlyCompleted(r.updatedAt, now),
    };
  });
}

async function correctiveActionItems(assignee: AssigneeFilter, now: Date): Promise<MyActionItem[]> {
  const rows = await prisma.correctiveAction.findMany({
    where: {
      assignedTo: { equals: assignee.name, mode: 'insensitive' },
      ...(assignee.workplace ? { workplace: assignee.workplace } : {}),
    },
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      status: true,
      priority: true,
      workplace: true,
      dueDate: true,
      closedAt: true,
      updatedAt: true,
    },
  });

  return rows.map((r) => {
    const overdue = r.status !== 'Closed' && isOverdue(r.dueDate, now);
    return {
      id: r.id,
      module: 'corrective_action' as const,
      referenceNumber: r.referenceNumber,
      title: r.title,
      status: r.status,
      priority: r.priority as MyActionPriority,
      dueDate: r.dueDate.toISOString(),
      workplace: r.workplace,
      route: `${ROUTE_PREFIX.corrective_action}/${r.id}`,
      overdue,
      dueSoon: r.status !== 'Closed' && !overdue && isDueSoon(r.dueDate, now),
      active: r.status === 'In Progress',
      awaitingVerification: r.status === 'Awaiting Verification',
      recentlyCompleted: (r.status === 'Verified' || r.status === 'Closed') && recentlyCompleted(r.closedAt ?? r.updatedAt, now),
    };
  });
}

async function inspectionItems(assignee: AssigneeFilter, now: Date): Promise<MyActionItem[]> {
  const rows = await prisma.inspection.findMany({
    where: {
      leadInspector: { equals: assignee.name, mode: 'insensitive' },
      ...(assignee.workplace ? { workplace: assignee.workplace } : {}),
    },
    select: { id: true, referenceNumber: true, title: true, status: true, workplace: true, inspectionDate: true, reviewedAt: true, updatedAt: true },
  });

  return rows.map((r) => {
    const isOpen = OPEN_INSPECTION_STATUSES.includes(r.status);
    const overdue = isOpen && isOverdue(r.inspectionDate, now);
    return {
      id: r.id,
      module: 'inspection' as const,
      referenceNumber: r.referenceNumber,
      title: r.title,
      status: r.status,
      // Inspections have no risk/priority field.
      priority: null,
      dueDate: r.inspectionDate.toISOString(),
      workplace: r.workplace,
      route: `${ROUTE_PREFIX.inspection}/${r.id}`,
      overdue,
      dueSoon: isOpen && !overdue && isDueSoon(r.inspectionDate, now),
      active: r.status === 'In Progress',
      // 'Submitted' has no named reviewer (see inspections/controller.ts) but is exactly the
      // "waiting on someone else to sign off" state — the same shape as Awaiting Verification
      // elsewhere, so it maps there rather than into a one-off inspection-only category.
      awaitingVerification: r.status === 'Submitted',
      recentlyCompleted: (r.status === 'Reviewed' || r.status === 'Closed') && recentlyCompleted(r.reviewedAt ?? r.updatedAt, now),
    };
  });
}

async function riskAssessmentItems(assignee: AssigneeFilter, now: Date): Promise<MyActionItem[]> {
  const rows = await prisma.riskAssessment.findMany({
    where: {
      assessedBy: { equals: assignee.name, mode: 'insensitive' },
      ...(assignee.workplace ? { workplace: assignee.workplace } : {}),
    },
    select: {
      id: true,
      referenceNumber: true,
      title: true,
      status: true,
      workplace: true,
      nextReviewDate: true,
      updatedAt: true,
      items: { select: { riskLevel: true, residualRiskLevel: true } },
    },
  });

  return rows.map((r) => {
    const overallRiskLevel: RiskLevel =
      r.items.length > 0
        ? highestRiskLevel(r.items.map((i) => (i.residualRiskLevel as RiskLevel | null) ?? (i.riskLevel as RiskLevel)))
        : 'Low';
    const overdue = r.status !== 'Closed' && r.nextReviewDate !== null && isOverdue(r.nextReviewDate, now);
    return {
      id: r.id,
      module: 'risk_assessment' as const,
      referenceNumber: r.referenceNumber,
      title: r.title,
      status: r.status,
      priority: overallRiskLevel as MyActionPriority,
      dueDate: r.nextReviewDate ? r.nextReviewDate.toISOString() : null,
      workplace: r.workplace,
      route: `${ROUTE_PREFIX.risk_assessment}/${r.id}`,
      overdue,
      dueSoon: r.status !== 'Closed' && !overdue && r.nextReviewDate !== null && isDueSoon(r.nextReviewDate, now),
      active: r.status === 'Under Review',
      // 'Under Review' already covers the "someone else needs to act" state for this
      // module — there is no separate awaiting-verification status to map here.
      awaitingVerification: false,
      recentlyCompleted: (r.status === 'Approved' || r.status === 'Closed') && recentlyCompleted(r.updatedAt, now),
    };
  });
}

function sortKey(item: MyActionItem): [number, number, number, number] {
  const overdueRank = item.overdue ? 0 : 1;
  const dueSoonRank = !item.overdue && item.dueSoon ? 0 : 1;
  const priorityRank = item.priority ? RANK[item.priority] : 4;
  const dueDateRank = item.dueDate ? new Date(item.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  return [overdueRank, dueSoonRank, priorityRank, dueDateRank];
}

function compareItems(a: MyActionItem, b: MyActionItem): number {
  const [aOverdue, aDueSoon, aPriority, aDueDate] = sortKey(a);
  const [bOverdue, bDueSoon, bPriority, bDueDate] = sortKey(b);
  return (
    aOverdue - bOverdue ||
    aDueSoon - bDueSoon ||
    aPriority - bPriority ||
    aDueDate - bDueDate ||
    a.title.localeCompare(b.title)
  );
}

function countsFor(items: MyActionItem[]): MyActionsCounts {
  return {
    all: items.length,
    overdue: items.filter((i) => i.overdue).length,
    dueSoon: items.filter((i) => i.dueSoon).length,
    active: items.filter((i) => i.active).length,
    awaitingVerification: items.filter((i) => i.awaitingVerification).length,
    recentlyCompleted: items.filter((i) => i.recentlyCompleted).length,
  };
}

/**
 * Aggregates every module with a genuine assignment concept (Hazard.assignedTo,
 * Finding.assignedTo, CorrectiveAction.assignedTo, Inspection.leadInspector,
 * RiskAssessment.assessedBy) for one user. `assignee` must already be the authenticated
 * caller's own identity — see myActions/controller.ts, which derives it from the session
 * and never accepts a client-supplied user id.
 */
export async function getMyActions(assignee: AssigneeFilter): Promise<MyActionsResponse> {
  const now = new Date();

  const [hazards, findings, correctiveActions, inspections, riskAssessments] = await Promise.all([
    hazardItems(assignee, now),
    findingItems(assignee, now),
    correctiveActionItems(assignee, now),
    inspectionItems(assignee, now),
    riskAssessmentItems(assignee, now),
  ]);

  const items = [...hazards, ...findings, ...correctiveActions, ...inspections, ...riskAssessments].sort(compareItems);

  return { items, counts: countsFor(items) };
}

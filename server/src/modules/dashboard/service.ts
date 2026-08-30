import { prisma } from '../../lib/prisma';
import { OPEN_INSPECTION_STATUSES } from '../inspections/service';
import { getCorrectiveActionClosureRate } from '../correctiveActions/service';
import { DUE_SOON_WINDOW_DAYS } from '../../lib/dueDate';
import type { Prisma } from '@prisma/client';
import type { DashboardSummary } from './types';

const HAZARD_CLOSED_STATUSES = ['Resolved', 'Closed'];
const RECENT_LIST_LIMIT = 5;

type WorkplaceFilter = { equals: string; mode: 'insensitive' } | undefined;

function withWorkplace<T extends Record<string, unknown>>(where: T, workplace: WorkplaceFilter): T & { workplace?: WorkplaceFilter } {
  return workplace ? { ...where, workplace } : where;
}

export async function getDashboardSummary(workplace: WorkplaceFilter): Promise<DashboardSummary> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const hazardOpenWhere: Prisma.HazardReportWhereInput = withWorkplace({ status: { notIn: HAZARD_CLOSED_STATUSES } }, workplace);
  const findingOpenWhere: Prisma.FindingWhereInput = withWorkplace({ status: { not: 'Closed' } }, workplace);
  const correctiveActionOverdueWhere: Prisma.CorrectiveActionWhereInput = withWorkplace(
    { status: { not: 'Closed' }, dueDate: { lt: now } },
    workplace,
  );
  const inspectionOpenWhere: Prisma.InspectionWhereInput = withWorkplace({ status: { in: OPEN_INSPECTION_STATUSES } }, workplace);

  const [
    openHazards,
    reportedThisWeek,
    openFindings,
    openFindingsHighOrCritical,
    overdueActions,
    oldestOverdue,
    actionsAwaitingVerification,
    criticalHazardWorkplaces,
    criticalHazards,
    inspectionsThisMonth,
    inspectionsCompletedThisMonth,
    inspectionsDueSoon,
    closureRate,
    recentHazardsRaw,
    criticalFindingsRaw,
    overdueCorrectiveActionsRaw,
    inProgressInspectionsRaw,
  ] = await Promise.all([
    prisma.hazardReport.count({ where: hazardOpenWhere }),
    prisma.hazardReport.count({ where: withWorkplace({ reportedAt: { gte: sevenDaysAgo } }, workplace) }),
    prisma.finding.count({ where: findingOpenWhere }),
    prisma.finding.count({ where: { ...findingOpenWhere, riskLevel: { in: ['High', 'Critical'] } } }),
    prisma.correctiveAction.count({ where: correctiveActionOverdueWhere }),
    prisma.correctiveAction.findFirst({ where: correctiveActionOverdueWhere, orderBy: { dueDate: 'asc' }, select: { dueDate: true } }),
    prisma.correctiveAction.count({ where: withWorkplace({ status: 'Awaiting Verification' }, workplace) }),
    prisma.hazardReport.groupBy({ by: ['workplace'], where: { ...hazardOpenWhere, riskLevel: 'Critical' } }),
    prisma.hazardReport.count({ where: { ...hazardOpenWhere, riskLevel: 'Critical' } }),
    prisma.inspection.count({ where: withWorkplace({ inspectionDate: { gte: monthStart, lt: monthEnd } }, workplace) }),
    prisma.inspection.count({
      where: withWorkplace({ inspectionDate: { gte: monthStart, lt: monthEnd }, status: { in: ['Reviewed', 'Closed'] } }, workplace),
    }),
    prisma.inspection.count({ where: { ...inspectionOpenWhere, inspectionDate: { gte: now, lte: dueSoonCutoff } } }),
    getCorrectiveActionClosureRate(workplace),
    prisma.hazardReport.findMany({
      where: withWorkplace({}, workplace),
      orderBy: { reportedAt: 'desc' },
      take: RECENT_LIST_LIMIT,
      select: { id: true, referenceNumber: true, title: true, workplace: true, location: true, riskLevel: true, status: true, reportedAt: true },
    }),
    prisma.finding.findMany({
      where: { ...findingOpenWhere, riskLevel: { in: ['High', 'Critical'] } },
      orderBy: { dueDate: 'asc' },
      take: RECENT_LIST_LIMIT,
      select: { id: true, referenceNumber: true, title: true, workplace: true, location: true, riskLevel: true, status: true, dueDate: true },
    }),
    prisma.correctiveAction.findMany({
      where: correctiveActionOverdueWhere,
      orderBy: { dueDate: 'asc' },
      take: RECENT_LIST_LIMIT,
      select: { id: true, referenceNumber: true, title: true, workplace: true, assignedTo: true, priority: true, status: true, dueDate: true },
    }),
    prisma.inspection.findMany({
      where: inspectionOpenWhere,
      orderBy: { inspectionDate: 'asc' },
      take: RECENT_LIST_LIMIT,
      select: {
        id: true,
        referenceNumber: true,
        title: true,
        workplace: true,
        leadInspector: true,
        inspectionDate: true,
        status: true,
        templateName: true,
      },
    }),
  ]);

  const criticalHazardWorkplaceCount = new Set(criticalHazardWorkplaces.map((r) => r.workplace.trim().toLowerCase())).size;

  return {
    openHazards,
    reportedThisWeek,
    openFindings,
    openFindingsHighOrCritical,
    overdueActions,
    oldestOverdueDays: oldestOverdue ? Math.round((now.getTime() - oldestOverdue.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
    actionsAwaitingVerification,
    // Critical Findings already has its own dedicated dashboard section below (populated
    // from criticalFindingsRaw) — this metric stays single-module (open Critical hazards)
    // so its Hazards-list deep link represents exactly the number shown, rather than
    // summing two modules into a count no single destination page could reproduce.
    criticalHazards,
    criticalHazardWorkplaces: criticalHazardWorkplaceCount,
    inspectionsThisMonth,
    inspectionsCompletedThisMonth,
    inspectionsUpcomingThisMonth: inspectionsThisMonth - inspectionsCompletedThisMonth,
    inspectionsDueSoon,
    // Exposed so the client can deep-link "Inspections This Month" to a list filtered by
    // the exact same [thisMonthStart, thisMonthEnd) window used for the count above,
    // rather than re-deriving month boundaries client-side (and risking drift/timezone bugs).
    thisMonthStart: monthStart.toISOString(),
    thisMonthEnd: monthEnd.toISOString(),
    closureRate,
    recentHazards: recentHazardsRaw.map((r) => ({ ...r, reportedAt: r.reportedAt.toISOString() })),
    criticalFindings: criticalFindingsRaw.map((r) => ({ ...r, dueDate: r.dueDate.toISOString() })),
    overdueCorrectiveActions: overdueCorrectiveActionsRaw.map((r) => ({ ...r, dueDate: r.dueDate.toISOString() })),
    inProgressInspections: inProgressInspectionsRaw.map((r) => ({ ...r, inspectionDate: r.inspectionDate.toISOString() })),
  };
}

import type { HazardReport, RiskLevel } from './hazardTypes';

/**
 * Target time (in hours) for a hazard to move past "New" and be fully
 * closed out, scaled by risk level. A Critical hazard sitting untouched
 * for 4+ hours is a bigger problem than a Low one sitting for a day.
 */
export const REVIEW_SLA_HOURS: Record<RiskLevel, number> = {
  Critical: 4,
  High: 24,
  Medium: 72,
  Low: 168,
};

const OPEN_STATUSES: HazardReport['status'][] = ['New', 'Under Review', 'Action Required'];

type SlaRelevantHazard = Pick<HazardReport, 'status' | 'riskLevel' | 'reportedAt'>;

export function getElapsedHours(hazard: Pick<HazardReport, 'reportedAt'>): number {
  return (Date.now() - new Date(hazard.reportedAt).getTime()) / (1000 * 60 * 60);
}

export function isHazardOverdue(hazard: SlaRelevantHazard): boolean {
  if (!OPEN_STATUSES.includes(hazard.status)) return false;
  return getElapsedHours(hazard) > REVIEW_SLA_HOURS[hazard.riskLevel];
}

export function formatOverdueBy(hazard: SlaRelevantHazard): string {
  const overdueHours = getElapsedHours(hazard) - REVIEW_SLA_HOURS[hazard.riskLevel];

  if (overdueHours < 1) return 'Overdue <1h';
  if (overdueHours < 24) return `Overdue ${Math.floor(overdueHours)}h`;
  const days = Math.floor(overdueHours / 24);
  return `Overdue ${days}d`;
}

export function formatSlaExplanation(hazard: SlaRelevantHazard): string {
  const target = REVIEW_SLA_HOURS[hazard.riskLevel];
  const targetLabel = target < 24 ? `${target} hours` : `${target / 24} days`;
  const elapsed = Math.floor(getElapsedHours(hazard));
  const elapsedLabel = elapsed < 24 ? `${elapsed} hours` : `${Math.floor(elapsed / 24)} days`;
  return `${hazard.riskLevel} hazards should be resolved within ${targetLabel}. This one has been open for ${elapsedLabel}.`;
}

// Server-side copy of client/src/lib/hazardSla.ts — same thresholds, kept in sync
// deliberately rather than shared, since client and server are separate packages with no
// shared lib directory. Used by the reminder scheduler to decide when a hazard is overdue;
// the client uses the identical numbers to render the "Overdue" badge in the UI.
import type { RiskLevel } from '../modules/hazards/types';

export const REVIEW_SLA_HOURS: Record<RiskLevel, number> = {
  Critical: 4,
  High: 24,
  Medium: 72,
  Low: 168,
};

const OPEN_STATUSES = ['New', 'Under Review', 'Action Required'];

export function isHazardOverdue(hazard: { status: string; riskLevel: RiskLevel; reportedAt: Date }, now: Date = new Date()): boolean {
  if (!OPEN_STATUSES.includes(hazard.status)) return false;
  const elapsedHours = (now.getTime() - hazard.reportedAt.getTime()) / (1000 * 60 * 60);
  return elapsedHours > REVIEW_SLA_HOURS[hazard.riskLevel];
}

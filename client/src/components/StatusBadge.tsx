import type { WorkflowStatus } from '../lib/types';
import type { HazardStatus } from '../lib/hazardTypes';
import type { InspectionStatus } from '../lib/inspectionTypes';
import type { TemplateStatus } from '../lib/inspectionTemplateTypes';
import type { CorrectiveActionStatus } from '../lib/correctiveActionTypes';
import type { WorkplaceStatus } from '../lib/workplaceTypes';
import type { RiskAssessmentStatus } from '../lib/riskAssessmentTypes';
import type { IncidentStatus } from '../lib/incidentTypes';

type BadgeStatus =
  | WorkflowStatus
  | HazardStatus
  | InspectionStatus
  | TemplateStatus
  | CorrectiveActionStatus
  | WorkplaceStatus
  | RiskAssessmentStatus
  | IncidentStatus;

const STATUS_STYLES: Record<BadgeStatus, string> = {
  Open: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  'Under Review': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Awaiting Verification': 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  Closed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Overdue: 'bg-red-500/10 text-red-400 border-red-500/30',
  New: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  'Action Required': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  Resolved: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  Draft: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  Submitted: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  Reviewed: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Inactive: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  Archived: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  Assigned: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  Verified: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  Approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  Reported: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  'Under Investigation': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
};

interface StatusBadgeProps {
  status: BadgeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

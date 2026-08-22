import { Link } from 'react-router-dom';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

interface CorrectiveActionSourceBadgeProps {
  action: CorrectiveAction;
}

export function CorrectiveActionSourceBadge({ action }: CorrectiveActionSourceBadgeProps) {
  const linkTarget =
    action.hazardId && action.hazardReferenceNumber
      ? { to: `/hazards/${action.hazardId}`, ref: action.hazardReferenceNumber }
      : action.findingId && action.findingReferenceNumber
        ? { to: `/findings/${action.findingId}`, ref: action.findingReferenceNumber }
        : action.inspectionId && action.inspectionReferenceNumber
          ? { to: `/inspections/${action.inspectionId}`, ref: action.inspectionReferenceNumber }
          : null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-border bg-canvas-raised px-2 py-0.5 text-xs text-muted">
      {action.sourceType}
      {linkTarget && (
        <>
          <span className="text-border">&middot;</span>
          <Link to={linkTarget.to} className="font-mono text-accent hover:underline">
            {linkTarget.ref}
          </Link>
        </>
      )}
      {!linkTarget && action.externalSourceReference && (
        <>
          <span className="text-border">&middot;</span>
          <span className="font-mono">{action.externalSourceReference}</span>
        </>
      )}
    </span>
  );
}

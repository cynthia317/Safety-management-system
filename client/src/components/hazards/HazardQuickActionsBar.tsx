import { ArrowRight, CheckCheck, MessageSquarePlus, ShieldCheck, Wrench, XCircle } from 'lucide-react';
import { Button } from '../Button';
import type { HazardStatus } from '../../lib/hazardTypes';

interface HazardQuickActionsBarProps {
  status: HazardStatus;
  onBeginReview: () => void;
  onRequireAction: () => void;
  onResolve: () => void;
  onViewCorrectiveAction: () => void;
  onAddUpdate: () => void;
  onVerify: () => void;
  onClose: () => void;
  onReopen: () => void;
}

export function HazardQuickActionsBar({
  status,
  onBeginReview,
  onRequireAction,
  onResolve,
  onViewCorrectiveAction,
  onAddUpdate,
  onVerify,
  onClose,
  onReopen,
}: HazardQuickActionsBarProps) {
  const actions: { label: string; icon: typeof ArrowRight; onClick: () => void; variant?: 'primary' | 'secondary' }[] =
    (() => {
      switch (status) {
        case 'New':
          return [{ label: 'Begin Review', icon: ArrowRight, onClick: onBeginReview, variant: 'primary' }];
        case 'Under Review':
          return [
            { label: 'Require Action', icon: Wrench, onClick: onRequireAction },
            { label: 'Resolve', icon: CheckCheck, onClick: onResolve, variant: 'primary' },
          ];
        case 'Action Required':
          return [
            { label: 'View Corrective Action', icon: Wrench, onClick: onViewCorrectiveAction },
            { label: 'Add Update', icon: MessageSquarePlus, onClick: onAddUpdate, variant: 'primary' },
          ];
        case 'Resolved':
          return [
            { label: 'Verify', icon: ShieldCheck, onClick: onVerify, variant: 'primary' },
            { label: 'Close', icon: CheckCheck, onClick: onClose },
            { label: 'Reopen', icon: XCircle, onClick: onReopen },
          ];
        case 'Closed':
          return [{ label: 'Reopen', icon: XCircle, onClick: onReopen }];
        default:
          return [];
      }
    })();

  if (actions.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-surface px-3.5 py-2.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">Next steps</span>
      {actions.map((action) => (
        <Button key={action.label} variant={action.variant ?? 'secondary'} onClick={action.onClick} className="text-xs">
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}

import { ArrowRight, CheckCheck, MessageSquarePlus, ShieldCheck, Wrench, XCircle } from 'lucide-react';
import { Button } from '../Button';
import type { HazardStatus } from '../../lib/hazardTypes';

interface HazardQuickActionsBarProps {
  status: HazardStatus;
  /** Whether the signed-in role may change status (server: canTriageHazard — everyone
   * except Worker). Status-transition actions are omitted entirely when false, since the
   * backend rejects them outright rather than just discouraging them in the UI. */
  canTriage: boolean;
  onBeginReview: () => void;
  onRequireAction: () => void;
  onResolve: () => void;
  onViewCorrectiveAction: () => void;
  onAddUpdate: () => void;
  onVerify: () => void;
  onClose: () => void;
  onReopen: () => void;
}

interface QuickAction {
  label: string;
  icon: typeof ArrowRight;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  /** True for actions that change status — gated on `canTriage` since the server rejects
   * them for a Worker. Actions that only post a comment or switch tabs are left ungated,
   * since the backend places no role restriction on them either. */
  triageOnly?: boolean;
}

export function HazardQuickActionsBar({
  status,
  canTriage,
  onBeginReview,
  onRequireAction,
  onResolve,
  onViewCorrectiveAction,
  onAddUpdate,
  onVerify,
  onClose,
  onReopen,
}: HazardQuickActionsBarProps) {
  const allActions: QuickAction[] = (() => {
    switch (status) {
      case 'New':
        return [{ label: 'Begin Review', icon: ArrowRight, onClick: onBeginReview, variant: 'primary', triageOnly: true }];
      case 'Under Review':
        return [
          { label: 'Require Action', icon: Wrench, onClick: onRequireAction, triageOnly: true },
          { label: 'Resolve', icon: CheckCheck, onClick: onResolve, variant: 'primary', triageOnly: true },
        ];
      case 'Action Required':
        return [
          { label: 'View Corrective Action', icon: Wrench, onClick: onViewCorrectiveAction },
          { label: 'Add Update', icon: MessageSquarePlus, onClick: onAddUpdate, variant: 'primary' },
        ];
      case 'Resolved':
        return [
          { label: 'Verify', icon: ShieldCheck, onClick: onVerify, variant: 'primary' },
          { label: 'Close', icon: CheckCheck, onClick: onClose, triageOnly: true },
          { label: 'Reopen', icon: XCircle, onClick: onReopen, triageOnly: true },
        ];
      case 'Closed':
        return [{ label: 'Reopen', icon: XCircle, onClick: onReopen, triageOnly: true }];
      default:
        return [];
    }
  })();

  const actions = allActions.filter((action) => !action.triageOnly || canTriage);

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

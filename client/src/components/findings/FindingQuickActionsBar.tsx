import { ArrowRight, CheckCheck, ShieldCheck, Undo2, XCircle } from 'lucide-react';
import { Button } from '../Button';
import type { FindingStatus } from '../../lib/findingTypes';

interface FindingQuickActionsBarProps {
  status: FindingStatus;
  onStartWork: () => void;
  onSubmitForVerification: () => void;
  onSendBack: () => void;
  onVerifyAndClose: () => void;
  onReopen: () => void;
}

export function FindingQuickActionsBar({
  status,
  onStartWork,
  onSubmitForVerification,
  onSendBack,
  onVerifyAndClose,
  onReopen,
}: FindingQuickActionsBarProps) {
  const actions: { label: string; icon: typeof ArrowRight; onClick: () => void; variant?: 'primary' | 'secondary' }[] =
    (() => {
      switch (status) {
        case 'Open':
          return [{ label: 'Start Work', icon: ArrowRight, onClick: onStartWork, variant: 'primary' }];
        case 'In Progress':
          return [
            { label: 'Submit for Verification', icon: ShieldCheck, onClick: onSubmitForVerification, variant: 'primary' },
          ];
        case 'Awaiting Verification':
          return [
            { label: 'Verify & Close', icon: CheckCheck, onClick: onVerifyAndClose, variant: 'primary' },
            { label: 'Send Back', icon: Undo2, onClick: onSendBack },
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

import { ArrowRight, CheckCheck, MessageSquarePlus, ShieldCheck, Undo2, XCircle } from 'lucide-react';
import { Button } from '../Button';
import { canCloseCorrectiveAction, canVerifyCorrectiveAction, type Role } from '../../lib/roles';
import type { CorrectiveActionStatus } from '../../lib/correctiveActionTypes';

interface CorrectiveActionQuickActionsBarProps {
  status: CorrectiveActionStatus;
  role: Role;
  onStartWork: () => void;
  onSubmitResponse: () => void;
  onVerify: () => void;
  onSendBack: () => void;
  onClose: () => void;
  onReopen: () => void;
}

export function CorrectiveActionQuickActionsBar({
  status,
  role,
  onStartWork,
  onSubmitResponse,
  onVerify,
  onSendBack,
  onClose,
  onReopen,
}: CorrectiveActionQuickActionsBarProps) {
  const canVerify = canVerifyCorrectiveAction(role);
  const canClose = canCloseCorrectiveAction(role);

  const actions: { label: string; icon: typeof ArrowRight; onClick: () => void; variant?: 'primary' | 'secondary' }[] =
    (() => {
      switch (status) {
        case 'Assigned':
          return [{ label: 'Start Work', icon: ArrowRight, onClick: onStartWork, variant: 'primary' }];
        case 'In Progress':
          return [{ label: 'Submit Response', icon: MessageSquarePlus, onClick: onSubmitResponse, variant: 'primary' }];
        case 'Awaiting Verification':
          return canVerify
            ? [
                { label: 'Verify', icon: ShieldCheck, onClick: onVerify, variant: 'primary' as const },
                { label: 'Send Back', icon: Undo2, onClick: onSendBack },
              ]
            : [];
        case 'Verified':
          return canClose ? [{ label: 'Close', icon: CheckCheck, onClick: onClose, variant: 'primary' as const }] : [];
        case 'Closed':
          return canClose ? [{ label: 'Reopen', icon: XCircle, onClick: onReopen }] : [];
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

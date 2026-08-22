import { Check } from 'lucide-react';
import type { CorrectiveAction } from '../../lib/correctiveActionTypes';

const STEPS = ['Identified', 'Assigned', 'In Progress', 'Evidence', 'Verification', 'Closure'] as const;

function stepIndexForStatus(action: CorrectiveAction): number {
  switch (action.status) {
    case 'Assigned':
      return 1;
    case 'In Progress':
      return 2;
    case 'Awaiting Verification':
      return action.evidenceNote || action.responseNote ? 4 : 3;
    case 'Verified':
      return 5;
    case 'Closed':
      return 6;
    default:
      return 1;
  }
}

interface CorrectiveActionWorkflowStepperProps {
  action: CorrectiveAction;
}

export function CorrectiveActionWorkflowStepper({ action }: CorrectiveActionWorkflowStepperProps) {
  const completedCount = stepIndexForStatus(action);

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-3 overflow-x-auto rounded-md border border-border bg-surface px-3.5 py-3">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1;
        const done = stepNumber <= completedCount;
        const current = stepNumber === completedCount + 1 && action.status !== 'Closed';

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  done
                    ? 'border-accent bg-accent text-accent-foreground'
                    : current
                      ? 'border-accent text-accent'
                      : 'border-border text-muted'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : stepNumber}
              </span>
              <span className={`whitespace-nowrap text-[11px] ${done || current ? 'font-medium text-heading' : 'text-muted'}`}>
                {step}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span className={`mx-1.5 mb-4 h-px w-6 shrink-0 sm:w-10 ${stepNumber < completedCount ? 'bg-accent' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

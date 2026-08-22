import { Check } from 'lucide-react';

export interface WizardStep {
  id: string;
  label: string;
}

interface WizardProgressProps {
  steps: WizardStep[];
  currentIndex: number;
}

export function WizardProgress({ steps, currentIndex }: WizardProgressProps) {
  return (
    <div className="mb-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        Step {currentIndex + 1} of {steps.length}
      </p>
      <div className="mt-2 flex items-center gap-1.5 overflow-x-auto">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={step.id} className="flex shrink-0 items-center gap-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    isComplete
                      ? 'bg-accent text-accent-foreground'
                      : isCurrent
                        ? 'border border-accent text-accent'
                        : 'border border-border text-muted'
                  }`}
                >
                  {isComplete ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span
                  className={`text-sm font-medium ${
                    isCurrent ? 'text-heading' : isComplete ? 'text-body' : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && <span className="mx-1 text-muted">&rarr;</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

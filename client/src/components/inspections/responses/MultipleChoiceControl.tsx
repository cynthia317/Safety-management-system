import type { ResponseControlProps } from './types';

export function MultipleChoiceControl({ question, value, onChange, disabled }: ResponseControlProps) {
  if (question.options.length === 0) {
    return <p className="text-xs italic text-muted">No options configured for this question.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {question.options.map((option) => {
        const isActive = value === option;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default disabled:opacity-60 ${
              isActive ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-surface text-body hover:bg-surface-hover'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

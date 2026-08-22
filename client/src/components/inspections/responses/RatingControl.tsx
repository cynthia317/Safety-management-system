import type { ResponseControlProps } from './types';

const SCALE = [1, 2, 3, 4, 5];

export function RatingControl({ value, onChange, disabled }: ResponseControlProps) {
  const selected = Number(value);

  return (
    <div className="flex gap-2">
      {SCALE.map((score) => {
        const isActive = selected === score;
        return (
          <button
            key={score}
            type="button"
            disabled={disabled}
            onClick={() => onChange(String(score))}
            aria-label={`Rate ${score} out of 5`}
            className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-default disabled:opacity-60 ${
              isActive ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-surface text-body hover:bg-surface-hover'
            }`}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
}

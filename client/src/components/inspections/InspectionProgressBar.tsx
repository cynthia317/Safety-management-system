import type { OverallProgress } from '../../lib/inspectionProgress';

interface InspectionProgressBarProps {
  progress: OverallProgress;
}

export function InspectionProgressBar({ progress }: InspectionProgressBarProps) {
  return (
    <div className="min-w-[160px]">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">
          {progress.answered} / {progress.total} answered
        </span>
        <span className="font-medium text-heading">{progress.percent}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-hover">
        <div
          className={`h-full rounded-full transition-all ${progress.percent === 100 ? 'bg-emerald-500' : 'bg-accent'}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}

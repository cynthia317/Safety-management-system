import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted" />
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

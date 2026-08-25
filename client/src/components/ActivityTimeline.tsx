import { AlertTriangle, CheckCircle2, FilePlus, FileSearch, History, ListChecks, MessageSquare, Paperclip, PlayCircle, RefreshCw, Save } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from './EmptyState';

export type ActivityEntryType =
  | 'created'
  | 'status_change'
  | 'updated'
  | 'comment'
  | 'started'
  | 'response_saved'
  | 'non_compliance_recorded'
  | 'section_completed'
  | 'saved'
  | 'submitted'
  | 'evidence_added'
  | 'finding_created';

export interface ActivityTimelineEntry {
  id: string;
  type: ActivityEntryType;
  message: string;
  actor: string;
  createdAt: string;
}

const TYPE_ICON: Record<ActivityEntryType, LucideIcon> = {
  created: FilePlus,
  status_change: RefreshCw,
  updated: History,
  comment: MessageSquare,
  started: PlayCircle,
  response_saved: Save,
  non_compliance_recorded: AlertTriangle,
  section_completed: ListChecks,
  saved: Save,
  submitted: CheckCircle2,
  evidence_added: Paperclip,
  finding_created: FileSearch,
};

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface ActivityTimelineProps {
  items: ActivityTimelineEntry[];
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
  if (items.length === 0) {
    return <EmptyState icon={History} title="No activity yet" description="Updates to this report will appear here." />;
  }

  return (
    <ul className="space-y-0">
      {items.map((entry, index) => {
        const Icon = TYPE_ICON[entry.type];
        const isLast = index === items.length - 1;

        return (
          <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border" aria-hidden="true" />
            )}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted">
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm text-heading">{entry.message}</p>
              <p className="mt-0.5 text-xs text-muted">
                {entry.actor} &middot; {formatTimestamp(entry.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  ListTodo,
  ShieldAlert,
  Siren,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { Tabs, type TabItem } from '../components/Tabs';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { Button } from '../components/Button';
import { RiskBadge } from '../components/RiskBadge';
import { OverdueBadge } from '../components/OverdueBadge';
import { formatDate } from '../lib/format';
import { getMyActions } from '../lib/myActionsApi';
import type { MyActionItem, MyActionModule, MyActionsResponse } from '../lib/myActionsApi';

type CategoryId = 'all' | 'overdue' | 'dueSoon' | 'active' | 'awaitingVerification' | 'recentlyCompleted';

const MODULE_LABEL: Record<MyActionModule, string> = {
  hazard: 'Hazard',
  finding: 'Finding',
  inspection: 'Inspection',
  risk_assessment: 'Risk Assessment',
  corrective_action: 'Corrective Action',
  incident: 'Incident',
};

const MODULE_ICON: Record<MyActionModule, LucideIcon> = {
  hazard: AlertTriangle,
  finding: FileSearch,
  inspection: ClipboardCheck,
  risk_assessment: ShieldAlert,
  corrective_action: Wrench,
  incident: Siren,
};

function matchesCategory(item: MyActionItem, category: CategoryId): boolean {
  switch (category) {
    case 'all':
      return true;
    case 'overdue':
      return item.overdue;
    case 'dueSoon':
      return item.dueSoon;
    case 'active':
      return item.active;
    case 'awaitingVerification':
      return item.awaitingVerification;
    case 'recentlyCompleted':
      return item.recentlyCompleted;
  }
}

export function MyActionsPage() {
  const [data, setData] = useState<MyActionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<CategoryId>('all');
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    getMyActions()
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your actions.');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const tabs: TabItem[] = useMemo(
    () => [
      { id: 'all', label: 'All', badge: data?.counts.all },
      { id: 'overdue', label: 'Overdue', badge: data?.counts.overdue },
      { id: 'dueSoon', label: 'Due Soon', badge: data?.counts.dueSoon },
      { id: 'active', label: 'In Progress', badge: data?.counts.active },
      { id: 'awaitingVerification', label: 'Awaiting Verification', badge: data?.counts.awaitingVerification },
      { id: 'recentlyCompleted', label: 'Recently Completed', badge: data?.counts.recentlyCompleted },
    ],
    [data],
  );

  const filtered = useMemo(() => (data ? data.items.filter((i) => matchesCategory(i, category)) : []), [data, category]);

  if (error) {
    return (
      <>
        <PageHeader title="My Actions" description="Work assigned to you, across every module, in one place." />
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load your actions"
          description={error}
          action={
            <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
              Retry
            </Button>
          }
        />
      </>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader title="My Actions" description="Work assigned to you, across every module, in one place." />
        <LoadingState label="Loading your actions…" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="My Actions" description="Work assigned to you, across every module, in one place." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Assigned to You" value={data.counts.all} icon={ListTodo} tone="accent" />
        <StatCard label="Overdue" value={data.counts.overdue} icon={AlertTriangle} tone="danger" />
        <StatCard label="Due Soon" value={data.counts.dueSoon} icon={ClipboardCheck} tone="warning" />
        <StatCard label="Awaiting Verification" value={data.counts.awaitingVerification} icon={CheckCircle2} tone="default" />
      </div>

      <SectionCard title="Your Work" description="Sorted overdue first, then due soon, then by priority." className="mt-4" noPadding>
        <div className="border-b border-border px-2">
          <Tabs tabs={tabs} activeId={category} onChange={(id) => setCategory(id as CategoryId)} />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nothing here"
            description={category === 'all' ? 'You have no work assigned to you right now.' : 'No items in this category right now.'}
          />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((item) => {
              const Icon = MODULE_ICON[item.module];
              return (
                <li key={`${item.module}-${item.id}`}>
                  <Link to={item.route} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-hover">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-500/10 text-muted">
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-xs text-muted">{item.referenceNumber}</p>
                        <span className="text-xs text-muted">{MODULE_LABEL[item.module]}</span>
                      </div>
                      <p className="truncate text-sm font-medium text-heading">{item.title}</p>
                      <p className="text-xs text-muted">{item.workplace}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        {item.priority && <RiskBadge level={item.priority} />}
                        <span className="whitespace-nowrap rounded border border-border px-2 py-0.5 text-xs font-medium text-body">
                          {item.status}
                        </span>
                      </div>
                      {item.overdue ? (
                        <OverdueBadge label="Overdue" />
                      ) : item.dueSoon ? (
                        <span className="text-xs font-medium text-amber-400">Due soon</span>
                      ) : item.dueDate ? (
                        <span className="text-xs text-muted">Due {formatDate(item.dueDate)}</span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </>
  );
}

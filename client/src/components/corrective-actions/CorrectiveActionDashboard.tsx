import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react';
import { StatCard } from '../StatCard';
import { SectionCard } from '../SectionCard';
import { LoadingState } from '../LoadingState';
import { SimpleBarChart } from '../charts/SimpleBarChart';
import { SimpleDonutChart } from '../charts/SimpleDonutChart';
import { SimpleTrendChart } from '../charts/SimpleTrendChart';
import { getCorrectiveActionStats } from '../../lib/correctiveActionsApi';
import type { CorrectiveActionStats } from '../../lib/correctiveActionTypes';

const STATUS_COLORS: Record<string, string> = {
  Assigned: '#38bdf8',
  'In Progress': '#60a5fa',
  'Awaiting Verification': '#a78bfa',
  Verified: '#22d3ee',
  Closed: '#34d399',
};

const PRIORITY_BAR_COLORS: Record<string, string> = {
  Low: 'bg-emerald-400',
  Medium: 'bg-amber-400',
  High: 'bg-orange-400',
  Critical: 'bg-red-400',
};

export function CorrectiveActionDashboard() {
  const [stats, setStats] = useState<CorrectiveActionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCorrectiveActionStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load statistics.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>;
  }

  if (!stats) {
    return <LoadingState label="Loading dashboard…" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Open Actions" value={stats.byStatus.Assigned} icon={Wrench} tone="default" />
        <StatCard label="In Progress" value={stats.byStatus['In Progress']} icon={Clock} tone="accent" />
        <StatCard label="Awaiting Verification" value={stats.byStatus['Awaiting Verification']} icon={ShieldAlert} tone="warning" />
        <StatCard label="Verified" value={stats.byStatus.Verified} icon={ShieldCheck} tone="success" />
        <StatCard label="Overdue" value={stats.overdueCount} icon={AlertTriangle} tone="danger" />
        <StatCard label="Closed This Month" value={stats.closedThisMonth} icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Avg. Closure Time" value={stats.averageClosureDays !== null ? `${stats.averageClosureDays}d` : '—'} icon={Clock} tone="default" />
        <StatCard label="Overdue Actions" value={stats.overdueCount} icon={AlertTriangle} tone="danger" />
        <StatCard label="Critical Open" value={stats.criticalOpenCount} icon={ShieldAlert} tone="danger" />
        <StatCard label="Closure Rate" value={`${stats.closureRate}%`} icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="Actions by Status">
          <SimpleDonutChart
            data={Object.entries(stats.byStatus).map(([label, value]) => ({
              label,
              value,
              colorHex: STATUS_COLORS[label] ?? '#94a3b8',
            }))}
          />
        </SectionCard>

        <SectionCard title="Actions by Priority">
          <SimpleBarChart
            data={Object.entries(stats.byPriority).map(([label, value]) => ({
              label,
              value,
              colorClassName: PRIORITY_BAR_COLORS[label],
            }))}
          />
        </SectionCard>

        <SectionCard title="Actions by Department">
          <SimpleBarChart data={stats.byDepartment.map((d) => ({ label: d.department, value: d.count }))} />
        </SectionCard>

        <SectionCard title="Monthly Closure Trend" description="Actions closed per month, last 6 months.">
          <SimpleTrendChart data={stats.monthlyClosureTrend.map((m) => ({ label: m.month, value: m.count }))} />
        </SectionCard>
      </div>
    </div>
  );
}

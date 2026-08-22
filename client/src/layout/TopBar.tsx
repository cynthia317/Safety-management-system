import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { navItems } from '../lib/nav';
import { useApiHealth, type ApiStatus } from '../lib/useApiHealth';
import { UserMenu } from '../components/UserMenu';
import { NotificationBell } from '../components/NotificationBell';

interface TopBarProps {
  onOpenMobileNav: () => void;
}

const STATUS_CONFIG: Record<ApiStatus, { label: string; dot: string; text: string }> = {
  checking: { label: 'Checking API…', dot: 'bg-amber-400', text: 'text-amber-400' },
  online: { label: 'API Online', dot: 'bg-emerald-400', text: 'text-emerald-400' },
  offline: { label: 'API Offline', dot: 'bg-red-400', text: 'text-red-400' },
};

export function TopBar({ onOpenMobileNav }: TopBarProps) {
  const { status } = useApiHealth();
  const location = useLocation();
  const current = navItems.find(
    (item) =>
      location.pathname === item.path ||
      (item.path !== '/dashboard' && location.pathname.startsWith(`${item.path}/`)),
  );
  const cfg = STATUS_CONFIG[status];

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-canvas-raised px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-8 w-8 items-center justify-center rounded text-body hover:bg-surface-hover hover:text-heading lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold text-heading sm:text-base">
          {current?.label ?? 'Dashboard'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserMenu />
        <div
          className={`flex items-center gap-2 rounded border border-border px-2.5 py-1 text-xs font-medium ${cfg.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          <span className="hidden sm:inline">{cfg.label}</span>
        </div>
      </div>
    </header>
  );
}

import { NavLink } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { navItems } from '../lib/nav';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-canvas-raised transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-heading">SafetyOS</p>
            <p className="text-[11px] text-muted">OSH Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-body hover:bg-surface-hover hover:text-heading'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <p className="text-[11px] text-muted">v0.1.0 &middot; Development build</p>
        </div>
      </aside>
    </>
  );
}

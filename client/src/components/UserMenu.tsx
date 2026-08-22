import { LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Popover } from './Popover';
import { useAuth } from '../lib/AuthContext';
import { useToast } from '../lib/ToastContext';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
    showToast('success', 'Signed out.');
  }

  return (
    <Popover
      align="right"
      trigger={
        <button
          type="button"
          className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1 text-xs font-medium text-body hover:bg-surface-hover hover:text-heading"
        >
          <UserIcon className="h-3.5 w-3.5 text-muted" strokeWidth={1.75} />
          <span className="hidden sm:inline">{user.name}</span>
        </button>
      }
    >
      {(close) => (
        <div>
          <div className="px-1 pb-2">
            <p className="text-sm font-medium text-heading">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
            <p className="mt-1 inline-block rounded border border-border px-1.5 py-0.5 text-[11px] text-muted">{user.role}</p>
          </div>
          <div className="border-t border-border pt-1">
            <button
              type="button"
              onClick={() => {
                close();
                void handleLogout();
              }}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-body transition-colors hover:bg-surface-hover hover:text-heading"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

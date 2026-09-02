import { UserCheck, UserPlus } from 'lucide-react';
import { Popover } from './Popover';
import { Button } from './Button';
import { useUsers } from '../lib/useUsers';

interface AssignOfficerMenuProps {
  assignedTo: string;
  onAssign: (officer: string) => Promise<void>;
  /** The record's own workplace — when given, the picker only offers that workplace's
   * roster (not the caller's own, and not org-wide for Admin), so an Admin managing a
   * record at another site can't assign someone who isn't actually eligible for it. */
  workplace?: string;
}

export function AssignOfficerMenu({ assignedTo, onAssign, workplace }: AssignOfficerMenuProps) {
  const users = useUsers(workplace);

  return (
    <Popover
      align="right"
      width="w-80"
      trigger={
        <Button variant={assignedTo ? 'secondary' : 'primary'}>
          {assignedTo ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {assignedTo ? 'Reassign' : 'Assign Officer'}
        </Button>
      }
    >
      {(close) => (
        <div>
          <p className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted">Assign to</p>
          <div className="space-y-0.5">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  void onAssign(u.name).then(close);
                }}
                className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  u.name === assignedTo ? 'text-accent' : 'text-body'
                }`}
              >
                <span className="truncate">{u.name}</span>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted">{u.role}</span>
              </button>
            ))}
          </div>
          {assignedTo && (
            <>
              <div className="my-1.5 border-t border-border" />
              <button
                type="button"
                onClick={() => {
                  void onAssign('').then(close);
                }}
                className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-muted transition-colors hover:bg-surface-hover hover:text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                Unassign
              </button>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}

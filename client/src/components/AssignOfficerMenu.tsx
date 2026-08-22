import { UserCheck, UserPlus } from 'lucide-react';
import { Popover } from './Popover';
import { Button } from './Button';
import { useUsers } from '../lib/useUsers';

interface AssignOfficerMenuProps {
  assignedTo: string;
  onAssign: (officer: string) => Promise<void>;
}

export function AssignOfficerMenu({ assignedTo, onAssign }: AssignOfficerMenuProps) {
  const users = useUsers();

  return (
    <Popover
      align="right"
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
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  u.name === assignedTo ? 'text-accent' : 'text-body'
                }`}
              >
                {u.name}
                <span className="text-xs text-muted">{u.role}</span>
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

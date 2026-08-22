import { useEffect, useState } from 'react';
import { AlertTriangle, Power, PowerOff } from 'lucide-react';
import { SectionCard } from '../SectionCard';
import { DataTable, type DataTableColumn } from '../DataTable';
import { EmptyState } from '../EmptyState';
import { LoadingState } from '../LoadingState';
import { Button } from '../Button';
import { Select } from '../form/Select';
import { Input } from '../form/Input';
import { StatusBadge } from '../StatusBadge';
import { listUsers, adminUpdateUser } from '../../lib/authApi';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../lib/ToastContext';
import { ApiError } from '../../lib/api';
import { ROLES, type Role } from '../../lib/roles';
import type { User } from '../../lib/authTypes';

export function UserManagementPanel() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    listUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load users.');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  async function handleRoleChange(id: string, role: Role) {
    setBusyId(id);
    try {
      const updated = await adminUpdateUser(id, { role });
      setUsers((prev) => prev?.map((u) => (u.id === id ? updated : u)) ?? null);
      showToast('success', `Role updated to ${role}.`);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Could not update role.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleWorkplaceChange(id: string, workplace: string) {
    if (!workplace.trim()) return;
    setBusyId(id);
    try {
      const updated = await adminUpdateUser(id, { workplace: workplace.trim() });
      setUsers((prev) => prev?.map((u) => (u.id === id ? updated : u)) ?? null);
      showToast('success', 'Workplace updated.');
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Could not update workplace.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(user: User) {
    setBusyId(user.id);
    try {
      const updated = await adminUpdateUser(user.id, { isActive: !user.isActive });
      setUsers((prev) => prev?.map((u) => (u.id === user.id ? updated : u)) ?? null);
      showToast('success', `${updated.name} marked as ${updated.isActive ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      showToast('error', err instanceof ApiError ? err.message : 'Could not update user.');
    } finally {
      setBusyId(null);
    }
  }

  const columns: DataTableColumn<User>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div>
          <p className="font-medium text-heading">
            {u.name}
            {u.id === currentUser?.id && <span className="ml-1.5 text-xs text-muted">(you)</span>}
          </p>
          <p className="text-xs text-muted">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (
        <Select
          value={u.role}
          disabled={busyId === u.id}
          className="min-w-[140px]"
          aria-label={`Role for ${u.name}`}
          onChange={(e) => void handleRoleChange(u.id, e.target.value as Role)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: 'workplace',
      header: 'Workplace',
      render: (u) => (
        <Input
          defaultValue={u.workplace}
          disabled={busyId === u.id}
          className="min-w-[160px]"
          aria-label={`Workplace for ${u.name}`}
          onBlur={(e) => {
            if (e.target.value.trim() !== u.workplace) void handleWorkplaceChange(u.id, e.target.value);
          }}
        />
      ),
    },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.isActive ? 'Active' : 'Inactive'} /> },
    {
      key: 'actions',
      header: '',
      render: (u) =>
        u.id === currentUser?.id ? (
          <span className="text-xs text-muted">Can't change your own status</span>
        ) : (
          <Button
            variant="secondary"
            className="text-xs"
            loading={busyId === u.id}
            onClick={() => void handleToggleActive(u)}
          >
            {u.isActive ? (
              <>
                <PowerOff className="h-3.5 w-3.5" />
                Deactivate
              </>
            ) : (
              <>
                <Power className="h-3.5 w-3.5" />
                Activate
              </>
            )}
          </Button>
        ),
    },
  ];

  return (
    <SectionCard title="Users" description="Manage roles, workplace assignment, and account access." noPadding>
      {error ? (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load users"
          description={error}
          action={
            <Button variant="secondary" className="mt-2" onClick={() => setReloadToken((t) => t + 1)}>
              Retry
            </Button>
          }
        />
      ) : !users ? (
        <LoadingState label="Loading users…" />
      ) : (
        <DataTable columns={columns} data={users} getRowKey={(u) => u.id} emptyMessage="No users found." />
      )}
    </SectionCard>
  );
}

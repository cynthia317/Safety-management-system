import { useEffect, useState } from 'react';
import { listAssignableUsers } from './authApi';
import type { AssignableUser } from './authTypes';

/** Registered users (name + role only), for "assign to" / "responsible person" pickers.
 * Scoped to the caller's own workplace on the server (Admin sees everyone) — pass
 * `workplace` to scope to a specific record's workplace instead (e.g. an Admin assigning a
 * particular Hazard should only be offered that Hazard's own workplace roster). */
export function useUsers(workplace?: string): AssignableUser[] {
  const [users, setUsers] = useState<AssignableUser[]>([]);

  useEffect(() => {
    let cancelled = false;

    listAssignableUsers(workplace)
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        // Picker falls back to an empty list — not worth surfacing an error for this.
      });

    return () => {
      cancelled = true;
    };
  }, [workplace]);

  return users;
}

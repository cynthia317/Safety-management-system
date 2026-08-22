import { useEffect, useState } from 'react';
import { listUsers } from './authApi';
import type { User } from './authTypes';

/** Registered users, for "assign to" / "responsible person" pickers. */
export function useUsers(): User[] {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;

    listUsers()
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        // Picker falls back to an empty list — not worth surfacing an error for this.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return users;
}

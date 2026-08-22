import { useEffect, useState } from 'react';
import { getHealth } from './api';

export type ApiStatus = 'checking' | 'online' | 'offline';

export interface ApiHealthState {
  status: ApiStatus;
  lastChecked: string | null;
}

export function useApiHealth(pollMs = 30000): ApiHealthState {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function check(): void {
      getHealth()
        .then((health) => {
          if (cancelled) return;
          setStatus('online');
          setLastChecked(health.timestamp);
        })
        .catch(() => {
          if (cancelled) return;
          setStatus('offline');
        });
    }

    check();
    const interval = setInterval(check, pollMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return { status, lastChecked };
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover } from './Popover';
import { EmptyState } from './EmptyState';
import { listNotifications, markAllNotificationsRead } from '../lib/notificationsApi';
import { formatRelativeTime } from '../lib/format';
import type { NotificationEvent } from '../lib/notificationTypes';

const POLL_INTERVAL_MS = 30000;

export function NotificationBell() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    let cancelled = false;

    function load() {
      listNotifications()
        .then((data) => {
          if (!cancelled) setEvents(data);
        })
        .catch(() => {
          // Non-critical — leave the bell showing whatever it last had.
        });
    }

    load();
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const unreadCount = events.filter((e) => !e.readAt).length;

  return (
    <Popover
      align="right"
      trigger={
        <button
          type="button"
          className="relative flex h-8 w-8 items-center justify-center rounded text-body hover:bg-surface-hover hover:text-heading"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-semibold text-accent-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      }
    >
      {(close) => (
        <div className="w-72 max-w-[80vw]">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-accent hover:underline"
                onClick={() => {
                  void markAllNotificationsRead().then(setEvents);
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {events.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications" description="Assignment and verification alerts will appear here." />
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto">
              {events.slice(0, 20).map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => {
                      navigate(`/corrective-actions/${event.relatedEntityId}`);
                      close();
                    }}
                    className={`block w-full rounded px-2 py-1.5 text-left transition-colors hover:bg-surface-hover ${
                      event.readAt ? 'opacity-70' : ''
                    }`}
                  >
                    <p className="text-xs font-medium text-heading">{event.subject}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatRelativeTime(event.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}

import { apiRequest } from './api';
import type { NotificationEvent } from './notificationTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listNotifications(): Promise<NotificationEvent[]> {
  return apiRequest<DataEnvelope<NotificationEvent[]>>('/api/notifications').then((res) => res.data);
}

export function markAllNotificationsRead(): Promise<NotificationEvent[]> {
  return apiRequest<DataEnvelope<NotificationEvent[]>>('/api/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({}),
  }).then((res) => res.data);
}

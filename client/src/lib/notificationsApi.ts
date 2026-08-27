import { apiRequest } from './api';
import type { NotificationEvent } from './notificationTypes';

interface DataEnvelope<T> {
  data: T;
}

export function listNotifications(): Promise<NotificationEvent[]> {
  return apiRequest<DataEnvelope<NotificationEvent[]>>('/api/notifications').then((res) => res.data);
}

export function getUnreadCount(): Promise<number> {
  return apiRequest<DataEnvelope<{ count: number }>>('/api/notifications/unread-count').then((res) => res.data.count);
}

export function markNotificationRead(id: string): Promise<NotificationEvent> {
  return apiRequest<DataEnvelope<NotificationEvent>>(`/api/notifications/${id}/read`, {
    method: 'POST',
    body: JSON.stringify({}),
  }).then((res) => res.data);
}

export function markAllNotificationsRead(): Promise<NotificationEvent[]> {
  return apiRequest<DataEnvelope<NotificationEvent[]>>('/api/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({}),
  }).then((res) => res.data);
}

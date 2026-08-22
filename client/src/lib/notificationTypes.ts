export type NotificationEventType =
  | 'corrective_action_assigned'
  | 'corrective_action_due_reminder'
  | 'corrective_action_overdue'
  | 'corrective_action_verification_requested';

export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  recipient: string;
  subject: string;
  message: string;
  relatedEntityType: 'corrective_action';
  relatedEntityId: string;
  relatedEntityReference: string;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}

export type NotificationEventType =
  | 'corrective_action_assigned'
  | 'corrective_action_due_reminder'
  | 'corrective_action_overdue'
  | 'corrective_action_verification_requested'
  | 'corrective_action_verified'
  | 'corrective_action_reopened'
  | 'corrective_action_closed'
  | 'hazard_reported'
  | 'hazard_assigned'
  | 'hazard_status_changed'
  | 'hazard_overdue'
  | 'finding_created'
  | 'finding_assigned'
  | 'finding_status_changed'
  | 'finding_due_reminder'
  | 'finding_overdue'
  | 'inspection_assigned'
  | 'inspection_submitted'
  | 'inspection_due_reminder'
  | 'inspection_overdue'
  | 'risk_assessment_assigned'
  | 'risk_assessment_submitted_for_review'
  | 'risk_assessment_approved'
  | 'risk_assessment_high_risk';

export type NotificationPriority = 'Normal' | 'High' | 'Critical';

export type NotificationRelatedEntityType = 'hazard' | 'finding' | 'inspection' | 'risk_assessment' | 'corrective_action';

export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  recipient: string;
  recipientId: string | null;
  workplace: string | null;
  priority: NotificationPriority | null;
  subject: string;
  message: string;
  relatedEntityType: NotificationRelatedEntityType;
  relatedEntityId: string;
  relatedEntityReference: string;
  createdAt: string;
  deliveredAt: string | null;
  readAt: string | null;
}

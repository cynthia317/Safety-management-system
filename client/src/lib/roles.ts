export type Role = 'Worker' | 'Supervisor' | 'EHS Officer' | 'Manager' | 'Admin';

export const ROLES: Role[] = ['Worker', 'Supervisor', 'EHS Officer', 'Manager', 'Admin'];

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Worker: 'View own assigned actions.',
  Supervisor: 'Manage actions within their department.',
  'EHS Officer': 'Create, assign, verify, and close actions.',
  Manager: 'View reports and performance metrics.',
  Admin: 'Full control.',
};

// Permission checks against the signed-in user's real role (see AuthContext).
export function canCreateCorrectiveAction(role: Role): boolean {
  return role !== 'Worker';
}

export function canAssignCorrectiveAction(role: Role): boolean {
  return role === 'Supervisor' || role === 'EHS Officer' || role === 'Admin';
}

export function canEditCorrectiveAction(role: Role): boolean {
  return role === 'Supervisor' || role === 'EHS Officer' || role === 'Admin';
}

export function canVerifyCorrectiveAction(role: Role): boolean {
  return role === 'EHS Officer' || role === 'Admin';
}

export function canCloseCorrectiveAction(role: Role): boolean {
  return role === 'EHS Officer' || role === 'Admin';
}

export function canManageUsers(role: Role): boolean {
  return role === 'Admin';
}

export function canManageWorkplaces(role: Role): boolean {
  return role === 'Admin';
}

export function canManageInspectionTemplates(role: Role): boolean {
  return role !== 'Worker';
}

export function canManageRiskAssessments(role: Role): boolean {
  return role !== 'Worker';
}

export function canManageFinding(role: Role): boolean {
  return role !== 'Worker';
}

// Hazard triage (reviewing, prioritising, assigning, changing status) is restricted to
// authorised personnel; any authenticated user may still report a hazard or add a comment.
export function canTriageHazard(role: Role): boolean {
  return role !== 'Worker';
}

// Admin has organisation-wide visibility/access; every other role is scoped to the single
// workplace on their own account. Mirrors server/src/modules/auth/permissions.ts.
export function hasOrgWideAccess(role: Role): boolean {
  return role === 'Admin';
}

export function canWorkOnCorrectiveAction(_role: Role): boolean {
  // Everyone can progress work (start work / submit response) — not restricted to the
  // exact assignee, since actions are sometimes handed off within a team informally.
  return true;
}

export function canManageIncidents(role: Role): boolean {
  return role !== 'Worker';
}

export function canAssignIncidentInvestigator(role: Role): boolean {
  return role === 'Supervisor' || role === 'EHS Officer' || role === 'Admin';
}

export function canCloseIncident(role: Role): boolean {
  return role === 'EHS Officer' || role === 'Admin';
}

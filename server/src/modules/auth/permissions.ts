// Server-side mirror of client/src/lib/roles.ts. The client copy governs what buttons
// render; this copy is the actual authorization boundary — every permission check here
// must stay in sync with the client's, since the two are only meant to differ in
// enforcement (client hides, server rejects), never in policy.
import type { PublicUser, Role } from './types';

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

// Hazard/finding triage (reviewing, prioritising, assigning, changing status) is
// restricted to authorised personnel; any authenticated user may still report a hazard
// or add a comment — frontline reporting stays simple, per product requirements.
export function canTriageHazard(role: Role): boolean {
  return role !== 'Worker';
}

export function canManageFinding(role: Role): boolean {
  return role !== 'Worker';
}

// Inspections: any authenticated, workplace-scoped user can conduct one (save responses,
// submit) — that's frontline work, same principle as hazard reporting. Creating one,
// editing its metadata, and moving it to Reviewed/Closed is a supervisory action.
export function canManageInspections(role: Role): boolean {
  return role !== 'Worker';
}

// Inspection templates are organisation-wide configuration (shared across every
// workplace), not a single record — publishing or archiving one changes what every
// inspector sees, so only non-Worker roles may create/edit/duplicate them. Reading the
// list/detail stays open to everyone, since conducting an inspection requires it.
export function canManageInspectionTemplates(role: Role): boolean {
  return role !== 'Worker';
}

// Risk assessments: drafting/editing is open to the same roles as other EHS workflows,
// but approving (or reopening a Closed assessment) is a sign-off and stays with the
// roles authorised to verify/close corrective actions.
export function canManageRiskAssessments(role: Role): boolean {
  return role !== 'Worker';
}

export function canApproveRiskAssessment(role: Role): boolean {
  return role === 'EHS Officer' || role === 'Admin';
}

// Workplaces/sites are organisation-wide structural configuration — who exists at all,
// not a workflow record — so only Admin may create or restructure them. Everyone can
// still read the list/detail (needed to pick a site on every other form).
export function canManageWorkplaces(role: Role): boolean {
  return role === 'Admin';
}

// Admin has organisation-wide visibility across every workplace/site; every other role
// (including Manager, pending a future multi-site membership model) is scoped to the
// single workplace on their own account. This keeps Phase 1 to what the current
// single-workplace-per-user schema actually supports, rather than inventing a
// multi-site membership model the data doesn't have yet.
export function hasOrgWideAccess(role: Role): boolean {
  return role === 'Admin';
}

function normalizeWorkplace(value: string): string {
  return value.trim().toLowerCase();
}

// `workplace` is a free-text field on both User and every domain record (no FK — see
// Phase 2 of the roadmap), so this is a normalized string comparison, not a relational
// lookup. Trimmed/case-insensitive to absorb minor data-entry inconsistencies between a
// user's own workplace string and a record's, since there is nothing enforcing they were
// typed identically.
export function canAccessRecordWorkplace(user: Pick<PublicUser, 'role' | 'workplace'>, recordWorkplace: string): boolean {
  return hasOrgWideAccess(user.role) || normalizeWorkplace(user.workplace) === normalizeWorkplace(recordWorkplace);
}

/** Prisma `where` fragment scoping a list query to the caller's workplace — `undefined`
 * means "no filter" (organisation-wide, Admin only). Case-insensitive to match
 * `canAccessRecordWorkplace`'s comparison. */
export function workplaceScopeWhere(user: Pick<PublicUser, 'role' | 'workplace'>): { equals: string; mode: 'insensitive' } | undefined {
  return hasOrgWideAccess(user.role) ? undefined : { equals: user.workplace, mode: 'insensitive' };
}

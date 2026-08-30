import type { Request, Response } from 'express';
import * as incidentService from './service';
import { validateAddEvidence, validateComment, validateCreateIncident, validateUpdateIncident } from './schema';
import {
  canAccessRecordWorkplace,
  canAssignIncidentInvestigator,
  canCloseIncident,
  canManageIncidents,
  workplaceScopeWhere,
} from '../auth/permissions';
import { notifyUser } from '../notifications/service';
import { excludeActor, resolveUserByName, resolveUsersByRole } from '../notifications/recipients';
import { parsePagination, paginationMeta } from '../../lib/pagination';
import type { Incident, IncidentCategory, IncidentStatus, EventType, Severity } from './types';

// High/Critical potential severity escalates to workplace EHS/Supervisor staff on report —
// same threshold and recipient tier as Hazard's own notifyHazardReported.
const ESCALATION_SEVERITIES = ['High', 'Critical'];

async function notifyInvestigatorAssigned(incident: Incident, actorName: string): Promise<void> {
  const investigator = await resolveUserByName(incident.leadInvestigator, incident.workplace);
  if (!investigator || investigator.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  await notifyUser(investigator, {
    type: 'incident_investigator_assigned',
    subject: `Investigation assigned: ${incident.referenceNumber}`,
    message: `You have been assigned to investigate ${incident.referenceNumber}: "${incident.title}".`,
    relatedEntityType: 'incident',
    relatedEntityId: incident.id,
    relatedEntityReference: incident.referenceNumber,
    priority: incident.potentialSeverity === 'Critical' || incident.potentialSeverity === 'High' ? incident.potentialSeverity : undefined,
  });
}

async function notifyIncidentReported(incident: Incident, actorName: string): Promise<void> {
  if (!ESCALATION_SEVERITIES.includes(incident.potentialSeverity)) return;

  const staff = await resolveUsersByRole(incident.workplace, ['EHS Officer', 'Supervisor']);
  const recipients = excludeActor(staff, actorName);

  await Promise.all(
    recipients.map((recipient) =>
      notifyUser(recipient, {
        type: 'incident_reported',
        subject: `${incident.potentialSeverity} potential-severity ${incident.eventType === 'NearMiss' ? 'near miss' : 'incident'} reported: ${incident.referenceNumber}`,
        message: `${actorName} reported ${incident.referenceNumber} at ${incident.workplace}: "${incident.title}" (potential severity: ${incident.potentialSeverity}).`,
        relatedEntityType: 'incident',
        relatedEntityId: incident.id,
        relatedEntityReference: incident.referenceNumber,
        priority: incident.potentialSeverity as 'High' | 'Critical',
      }),
    ),
  );
}

async function notifyStatusChanged(incident: Incident, actorName: string): Promise<void> {
  if (!incident.leadInvestigator) return;
  const investigator = await resolveUserByName(incident.leadInvestigator, incident.workplace);
  if (!investigator || investigator.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  await notifyUser(investigator, {
    type: 'incident_status_changed',
    subject: `Incident status updated: ${incident.referenceNumber}`,
    message: `${incident.referenceNumber} ("${incident.title}") changed to ${incident.status}.`,
    relatedEntityType: 'incident',
    relatedEntityId: incident.id,
    relatedEntityReference: incident.referenceNumber,
  });
}

function forbidden(res: Response, message: string): void {
  res.status(403).json({ error: { code: 'FORBIDDEN', message } });
}

function forbiddenWorkplace(res: Response): void {
  forbidden(res, 'You do not have access to this workplace.');
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function queryDate(value: unknown): Date | undefined {
  const raw = queryString(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function listIncidentsHandler(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const investigatorRaw = queryString(req.query.investigator);
  const investigator = investigatorRaw === 'me' ? req.user!.name : investigatorRaw;

  const scopeWhere = workplaceScopeWhere(req.user!);
  const requestedWorkplace = queryString(req.query.workplace);
  const departmentRaw = queryString(req.query.department);

  const { items, total } = await incidentService.listIncidents({
    workplace: scopeWhere ?? (requestedWorkplace ? { equals: requestedWorkplace, mode: 'insensitive' } : undefined),
    eventType: queryString(req.query.eventType) as EventType | undefined,
    category: queryString(req.query.category) as IncidentCategory | undefined,
    status: queryString(req.query.status) as IncidentStatus | undefined,
    openOnly: req.query.openOnly === 'true',
    severity: queryString(req.query.severity) as Severity | undefined,
    highPotential: req.query.highPotential === 'true',
    department: departmentRaw ? { equals: departmentRaw, mode: 'insensitive' } : undefined,
    investigator: investigator ? { equals: investigator, mode: 'insensitive' } : undefined,
    eventDateFrom: queryDate(req.query.from),
    eventDateTo: queryDate(req.query.to),
    search: queryString(req.query.search),
    sort: queryString(req.query.sort) as 'newest' | 'oldest' | undefined,
    pagination,
  });

  res.json({ data: items, ...(pagination ? { meta: paginationMeta(total, pagination) } : {}) });
}

export async function getIncidentHandler(req: Request, res: Response): Promise<void> {
  const incident = await incidentService.getIncidentDetail(req.params.id as string);

  if (!incident) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Incident "${req.params.id}" was not found.` } });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, incident.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  res.json({ data: incident });
}

export async function createIncidentHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateCreateIncident(req.body);

  if (errors) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors } });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, value.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  // reportedBy is always the authenticated caller — never a client-supplied value.
  const result = await incidentService.createIncident(value, req.user!.name);

  if ('error' in result) {
    res.status(400).json({ error: { code: 'INVALID_LINK', message: result.error } });
    return;
  }

  await notifyIncidentReported(result, req.user!.name);
  res.status(201).json({ data: result });
}

export async function updateIncidentHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await incidentService.getIncidentDetail(id);

  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Incident "${id}" was not found.` } });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateUpdateIncident(req.body);

  if (errors) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors } });
    return;
  }

  if (value.workplace !== undefined && !canAccessRecordWorkplace(req.user!, value.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const role = req.user!.role;

  if (Object.keys(value).some((k) => k !== 'actor') && !canManageIncidents(role)) {
    forbidden(res, 'Your role cannot edit incidents.');
    return;
  }
  if (value.leadInvestigator !== undefined && !canAssignIncidentInvestigator(role)) {
    forbidden(res, 'Your role cannot assign an investigator.');
    return;
  }
  if (value.status !== undefined) {
    const isClosing = value.status === 'Closed';
    const isReopening = existing.status === 'Closed' && value.status !== 'Closed';
    if ((isClosing || isReopening) && !canCloseIncident(role)) {
      forbidden(res, 'Your role cannot close or reopen incidents.');
      return;
    }
  }

  value.actor = req.user!.name;

  const result = await incidentService.updateIncident(id, existing, value);

  if (!result.ok) {
    res.status(400).json({ error: { code: 'INVALID_TRANSITION', message: result.error } });
    return;
  }

  if (value.leadInvestigator !== undefined && value.leadInvestigator !== existing.leadInvestigator) {
    await notifyInvestigatorAssigned(result.incident, req.user!.name);
  }
  if (value.status !== undefined && value.status !== existing.status) {
    await notifyStatusChanged(result.incident, req.user!.name);
  }

  res.json({ data: result.incident });
}

export async function addCommentHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await incidentService.getIncidentDetail(id);

  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Incident "${id}" was not found.` } });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateComment(req.body);

  if (errors) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors } });
    return;
  }

  value.author = req.user!.name;

  const comment = await incidentService.addComment(id, value);
  res.status(201).json({ data: comment });
}

export async function addEvidenceHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await incidentService.getIncidentDetail(id);

  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Incident "${id}" was not found.` } });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateAddEvidence(req.body);

  if (errors) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors } });
    return;
  }

  const items = await incidentService.addEvidence(id, value.files, req.user!.name);
  res.status(201).json({ data: items });
}

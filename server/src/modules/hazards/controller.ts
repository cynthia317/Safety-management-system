import type { Request, Response } from 'express';
import * as hazardService from './service';
import { validateComment, validateCreateHazard, validateUpdateHazard } from './schema';
import { canAccessRecordWorkplace, canTriageHazard, workplaceScopeWhere } from '../auth/permissions';
import { notifyUser } from '../notifications/service';
import { excludeActor, resolveUserByName, resolveUsersByRole } from '../notifications/recipients';
import { parsePagination, paginationMeta } from '../../lib/pagination';
import type { HazardReport, HazardStatus, RiskLevel } from './types';

const ESCALATION_RISK_LEVELS = ['High', 'Critical'];

async function notifyHazardAssigned(hazard: HazardReport, actorName: string): Promise<void> {
  const assignee = await resolveUserByName(hazard.assignedTo, hazard.workplace);
  if (!assignee || assignee.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  await notifyUser(assignee, {
    type: 'hazard_assigned',
    subject: `Hazard assigned: ${hazard.referenceNumber}`,
    message: `You have been assigned hazard report ${hazard.referenceNumber}: "${hazard.title}".`,
    relatedEntityType: 'hazard',
    relatedEntityId: hazard.id,
    relatedEntityReference: hazard.referenceNumber,
    priority: hazard.riskLevel === 'Critical' || hazard.riskLevel === 'High' ? hazard.riskLevel : undefined,
  });
}

// High/Critical hazards escalate to the workplace's EHS/Supervisor staff on report — every
// other risk level stays in the assignee's own feed, per "avoid notification spam".
async function notifyHazardReported(hazard: HazardReport, actorName: string): Promise<void> {
  if (!ESCALATION_RISK_LEVELS.includes(hazard.riskLevel)) return;

  const staff = await resolveUsersByRole(hazard.workplace, ['EHS Officer', 'Supervisor']);
  const recipients = excludeActor(staff, actorName).filter((r) => r.name.trim().toLowerCase() !== hazard.assignedTo.trim().toLowerCase());

  await Promise.all(
    recipients.map((recipient) =>
      notifyUser(recipient, {
        type: 'hazard_reported',
        subject: `${hazard.riskLevel} hazard reported: ${hazard.referenceNumber}`,
        message: `${actorName} reported a ${hazard.riskLevel.toLowerCase()}-risk hazard at ${hazard.workplace}: "${hazard.title}".`,
        relatedEntityType: 'hazard',
        relatedEntityId: hazard.id,
        relatedEntityReference: hazard.referenceNumber,
        priority: hazard.riskLevel as 'High' | 'Critical',
      }),
    ),
  );
}

async function notifyHazardStatusChanged(hazard: HazardReport, previousStatus: string, actorName: string): Promise<void> {
  const assignee = await resolveUserByName(hazard.assignedTo, hazard.workplace);
  if (!assignee || assignee.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  await notifyUser(assignee, {
    type: 'hazard_status_changed',
    subject: `Hazard status updated: ${hazard.referenceNumber}`,
    message: `${hazard.referenceNumber} ("${hazard.title}") changed from ${previousStatus} to ${hazard.status}.`,
    relatedEntityType: 'hazard',
    relatedEntityId: hazard.id,
    relatedEntityReference: hazard.referenceNumber,
  });
}

function forbiddenWorkplace(res: Response): void {
  res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'You do not have access to this workplace.' },
  });
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export async function listHazardsHandler(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const assignedToRaw = queryString(req.query.assignedTo);
  const unassignedOnly = assignedToRaw === 'unassigned';
  const assignedTo = assignedToRaw === 'me' ? req.user!.name : !unassignedOnly ? assignedToRaw : undefined;
  const sort = queryString(req.query.sort) as 'newest' | 'oldest' | 'risk' | undefined;

  const scopeWhere = workplaceScopeWhere(req.user!);
  const requestedWorkplace = queryString(req.query.workplace);

  const { items, total } = await hazardService.listHazards({
    workplace: scopeWhere ?? (requestedWorkplace ? { equals: requestedWorkplace, mode: 'insensitive' } : undefined),
    status: queryString(req.query.status) as HazardStatus | undefined,
    riskLevel: queryString(req.query.riskLevel) as RiskLevel | undefined,
    assignedTo: assignedTo ? { equals: assignedTo, mode: 'insensitive' } : undefined,
    unassignedOnly,
    overdue: req.query.overdue === 'true',
    openOnly: req.query.openOnly === 'true',
    hazardCategory: queryString(req.query.hazardCategory),
    reportedAfter: queryString(req.query.reportedAfter) ? new Date(queryString(req.query.reportedAfter)!) : undefined,
    search: queryString(req.query.search),
    sort,
    pagination,
  });

  res.json({ data: items, ...(pagination ? { meta: paginationMeta(total, pagination) } : {}) });
}

export async function getHazardHandler(req: Request, res: Response): Promise<void> {
  const hazard = await hazardService.getHazardDetail(req.params.id as string);

  if (!hazard) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Hazard report "${req.params.id}" was not found.`,
      },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, hazard.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  res.json({ data: hazard });
}

export async function createHazardHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateCreateHazard(req.body);

  if (errors) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        details: errors,
      },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, value.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  // The reporter is always the authenticated caller, not a client-supplied name.
  value.reportedBy = req.user!.name;

  const hazard = await hazardService.createHazard(value);
  await Promise.all([notifyHazardAssigned(hazard, req.user!.name), notifyHazardReported(hazard, req.user!.name)]);
  res.status(201).json({ data: hazard });
}

export async function updateHazardHandler(req: Request, res: Response): Promise<void> {
  if (!canTriageHazard(req.user!.role)) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Your role cannot review or update hazard reports.' },
    });
    return;
  }

  const id = req.params.id as string;
  const existing = await hazardService.getHazardDetail(id);

  if (!existing) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Hazard report "${id}" was not found.`,
      },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateUpdateHazard(req.body);

  if (errors) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        details: errors,
      },
    });
    return;
  }

  if (value.workplace !== undefined && !canAccessRecordWorkplace(req.user!, value.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  value.actor = req.user!.name;

  const updated = await hazardService.updateHazard(id, existing, value);

  if (updated) {
    if (value.assignedTo !== undefined && value.assignedTo !== existing.assignedTo) {
      await notifyHazardAssigned(updated, req.user!.name);
    }
    if (value.status !== undefined && value.status !== existing.status) {
      await notifyHazardStatusChanged(updated, existing.status, req.user!.name);
    }
  }

  res.json({ data: updated });
}

export async function addCommentHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await hazardService.getHazardDetail(id);

  if (!existing) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Hazard report "${id}" was not found.`,
      },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateComment(req.body);

  if (errors) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        details: errors,
      },
    });
    return;
  }

  value.author = req.user!.name;

  const comment = await hazardService.addComment(id, value);
  res.status(201).json({ data: comment });
}

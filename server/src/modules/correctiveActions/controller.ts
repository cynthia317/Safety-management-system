import type { Request, Response } from 'express';
import * as actionService from './service';
import { validateAddEvidence, validateComment, validateCreateCorrectiveAction, validateUpdateCorrectiveAction } from './schema';
import {
  canAccessRecordWorkplace,
  canAssignCorrectiveAction,
  canCloseCorrectiveAction,
  canCreateCorrectiveAction,
  canEditCorrectiveAction,
  canVerifyCorrectiveAction,
  workplaceScopeWhere,
} from '../auth/permissions';
import { parsePagination, paginationMeta } from '../../lib/pagination';
import type { CorrectiveActionStatus, RiskLevel } from './types';

function forbidden(res: Response, message = 'You do not have permission to do this.'): void {
  res.status(403).json({ error: { code: 'FORBIDDEN', message } });
}

function forbiddenWorkplace(res: Response): void {
  forbidden(res, 'You do not have access to this workplace.');
}

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export async function listCorrectiveActionsHandler(req: Request, res: Response): Promise<void> {
  const hazardId = queryString(req.query.hazardId);
  const inspectionId = queryString(req.query.inspectionId);
  const riskAssessmentId = queryString(req.query.riskAssessmentId);
  const incidentId = queryString(req.query.incidentId);
  const findingIdParam = req.query.findingId;
  const findingIds = Array.isArray(findingIdParam)
    ? findingIdParam.filter((v): v is string => typeof v === 'string')
    : typeof findingIdParam === 'string'
      ? [findingIdParam]
      : undefined;

  const pagination = parsePagination(req.query as Record<string, unknown>);
  const assignedToRaw = queryString(req.query.assignedTo);
  const assignedTo = assignedToRaw === 'me' ? req.user!.name : assignedToRaw;

  const scopeWhere = workplaceScopeWhere(req.user!);
  const requestedWorkplace = queryString(req.query.workplace);

  const { items, total } = await actionService.listCorrectiveActions({
    hazardId,
    findingIds,
    inspectionId,
    riskAssessmentId,
    incidentId,
    workplace: scopeWhere ?? (requestedWorkplace ? { equals: requestedWorkplace, mode: 'insensitive' } : undefined),
    status: queryString(req.query.status) as CorrectiveActionStatus | undefined,
    priority: queryString(req.query.priority) as RiskLevel | undefined,
    assignedTo: assignedTo ? { equals: assignedTo, mode: 'insensitive' } : undefined,
    overdue: req.query.overdue === 'true',
    search: queryString(req.query.search),
    sort: queryString(req.query.sort) as 'newest' | 'oldest' | 'dueDate' | 'priority' | undefined,
    pagination,
  });

  res.json({ data: items, ...(pagination ? { meta: paginationMeta(total, pagination) } : {}) });
}

export async function getCorrectiveActionHandler(req: Request, res: Response): Promise<void> {
  const action = await actionService.getCorrectiveActionDetail(req.params.id as string);

  if (!action) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Corrective action "${req.params.id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, action.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  res.json({ data: action });
}

export async function createCorrectiveActionHandler(req: Request, res: Response): Promise<void> {
  if (!canCreateCorrectiveAction(req.user!.role)) {
    forbidden(res, 'Your role cannot create corrective actions.');
    return;
  }

  const { errors, value } = validateCreateCorrectiveAction(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, value.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  // The creator is always the authenticated caller, never a client-supplied name —
  // otherwise anyone could attribute a corrective action to someone else in the audit trail.
  value.createdBy = req.user!.name;

  const result = await actionService.createCorrectiveAction(value);
  if ('error' in result) {
    res.status(400).json({ error: { code: 'INVALID_SOURCE_LINK', message: result.error } });
    return;
  }

  res.status(201).json({ data: result });
}

export async function updateCorrectiveActionHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await actionService.getCorrectiveActionDetail(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Corrective action "${id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateUpdateCorrectiveAction(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  if (value.workplace !== undefined && !canAccessRecordWorkplace(req.user!, value.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const role = req.user!.role;

  // Who performed this change is always the authenticated caller — never a client-supplied
  // name — so the activity/audit trail can't be spoofed. Any client-sent `verifiedBy` is
  // dropped here too; it is only ever set below, on an authorised verify transition.
  value.actor = req.user!.name;
  delete value.verifiedBy;

  const editingCoreFields =
    value.title !== undefined ||
    value.description !== undefined ||
    value.workplace !== undefined ||
    value.department !== undefined ||
    value.location !== undefined ||
    value.priority !== undefined ||
    value.dueDate !== undefined;

  if (editingCoreFields && !canEditCorrectiveAction(role)) {
    forbidden(res, 'Your role cannot edit corrective action details.');
    return;
  }

  if (value.assignedTo !== undefined && value.assignedTo !== existing.assignedTo && !canAssignCorrectiveAction(role)) {
    forbidden(res, 'Your role cannot reassign corrective actions.');
    return;
  }

  if (value.status !== undefined && value.status !== existing.status) {
    const nextStatus = value.status;

    if (nextStatus === 'Verified') {
      if (existing.status === 'Closed') {
        // Reopen: moves a Closed action back to Verified.
        if (!canCloseCorrectiveAction(role)) {
          forbidden(res, 'Your role cannot reopen corrective actions.');
          return;
        }
      } else {
        if (!canVerifyCorrectiveAction(role)) {
          forbidden(res, 'Your role cannot verify corrective actions.');
          return;
        }
        if (existing.evidence.length === 0) {
          res.status(400).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Cannot verify a corrective action with no evidence submitted.',
              details: { status: 'At least one evidence file is required before verification.' },
            },
          });
          return;
        }
        value.verifiedBy = req.user!.name;
      }
    } else if (nextStatus === 'Closed') {
      if (!canCloseCorrectiveAction(role)) {
        forbidden(res, 'Your role cannot close corrective actions.');
        return;
      }
    } else if (nextStatus === 'In Progress' && existing.status === 'Awaiting Verification') {
      // Sending a response back for more work is part of the verification role.
      if (!canVerifyCorrectiveAction(role)) {
        forbidden(res, 'Your role cannot send a corrective action back for more work.');
        return;
      }
    }
    // Assigned -> In Progress (start work) and In Progress -> Awaiting Verification
    // (submit response) are open to whoever is doing the work.
  }

  const updated = await actionService.updateCorrectiveAction(id, existing, value);
  res.json({ data: updated });
}

export async function addCommentHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await actionService.getCorrectiveActionDetail(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Corrective action "${id}" was not found.` },
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
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  value.author = req.user!.name;

  const comment = await actionService.addComment(id, value);
  res.status(201).json({ data: comment });
}

export async function addEvidenceHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await actionService.getCorrectiveActionDetail(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Corrective action "${id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateAddEvidence(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const items = await actionService.addEvidence(id, value.files, req.user!.name);
  res.status(201).json({ data: items });
}

export async function getCorrectiveActionStatsHandler(req: Request, res: Response): Promise<void> {
  res.json({ data: await actionService.getCorrectiveActionStats(workplaceScopeWhere(req.user!)) });
}

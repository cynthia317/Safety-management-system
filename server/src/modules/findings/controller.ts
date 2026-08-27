import type { Request, Response } from 'express';
import * as findingService from './service';
import * as inspectionService from '../inspections/service';
import { validateComment, validateCreateFinding, validateCreateFindingFromResponse, validateUpdateFinding } from './schema';
import { canAccessRecordWorkplace, canManageFinding, workplaceScopeWhere } from '../auth/permissions';
import { notifyUser } from '../notifications/service';
import { resolveUserByName } from '../notifications/recipients';
import { parsePagination, paginationMeta } from '../../lib/pagination';
import type { Finding, FindingStatus, RiskLevel } from './types';

async function notifyFindingAssigned(finding: Finding, actorName: string): Promise<void> {
  const assignee = await resolveUserByName(finding.assignedTo, finding.workplace);
  if (!assignee || assignee.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  const sourceNote = finding.inspectionReferenceNumber ? ` (from inspection ${finding.inspectionReferenceNumber})` : '';
  await notifyUser(assignee, {
    type: 'finding_assigned',
    subject: `Finding assigned: ${finding.referenceNumber}`,
    message: `You have been assigned finding ${finding.referenceNumber}${sourceNote}: "${finding.title}", due ${new Date(finding.dueDate).toLocaleDateString()}.`,
    relatedEntityType: 'finding',
    relatedEntityId: finding.id,
    relatedEntityReference: finding.referenceNumber,
    priority: finding.riskLevel === 'Critical' || finding.riskLevel === 'High' ? finding.riskLevel : undefined,
  });
}

async function notifyFindingStatusChanged(finding: Finding, previousStatus: string, actorName: string): Promise<void> {
  const assignee = await resolveUserByName(finding.assignedTo, finding.workplace);
  if (!assignee || assignee.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  await notifyUser(assignee, {
    type: 'finding_status_changed',
    subject: `Finding status updated: ${finding.referenceNumber}`,
    message: `${finding.referenceNumber} ("${finding.title}") changed from ${previousStatus} to ${finding.status}.`,
    relatedEntityType: 'finding',
    relatedEntityId: finding.id,
    relatedEntityReference: finding.referenceNumber,
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

export async function listFindingsHandler(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const assignedToRaw = queryString(req.query.assignedTo);
  const assignedTo = assignedToRaw === 'me' ? req.user!.name : assignedToRaw;

  const scopeWhere = workplaceScopeWhere(req.user!);
  const requestedWorkplace = queryString(req.query.workplace);

  const { items, total } = await findingService.listFindings({
    hazardId: queryString(req.query.hazardId),
    inspectionId: queryString(req.query.inspectionId),
    workplace: scopeWhere ?? (requestedWorkplace ? { equals: requestedWorkplace, mode: 'insensitive' } : undefined),
    status: queryString(req.query.status) as FindingStatus | undefined,
    riskLevel: queryString(req.query.riskLevel) as RiskLevel | undefined,
    assignedTo: assignedTo ? { equals: assignedTo, mode: 'insensitive' } : undefined,
    overdue: req.query.overdue === 'true',
    openOnly: req.query.openOnly === 'true',
    search: queryString(req.query.search),
    sort: queryString(req.query.sort) as 'newest' | 'oldest' | 'dueDate' | 'risk' | undefined,
    pagination,
  });

  res.json({ data: items, ...(pagination ? { meta: paginationMeta(total, pagination) } : {}) });
}

export async function getFindingHandler(req: Request, res: Response): Promise<void> {
  const finding = await findingService.getFindingDetail(req.params.id as string);

  if (!finding) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Finding "${req.params.id}" was not found.`,
      },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, finding.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  res.json({ data: finding });
}

export async function createFindingHandler(req: Request, res: Response): Promise<void> {
  if (!canManageFinding(req.user!.role)) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Your role cannot create findings.' } });
    return;
  }

  const { errors, value } = validateCreateFinding(req.body);

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

  value.createdBy = req.user!.name;

  const result = await findingService.createFinding(value);
  if ('error' in result) {
    res.status(400).json({ error: { code: 'INVALID_SOURCE_LINK', message: result.error } });
    return;
  }

  await notifyFindingAssigned(result, req.user!.name);
  res.status(201).json({ data: result });
}

export async function createFindingFromResponseHandler(req: Request, res: Response): Promise<void> {
  if (!canManageFinding(req.user!.role)) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Your role cannot create findings.' } });
    return;
  }

  const inspectionId = req.params.id as string;
  const questionId = req.params.questionId as string;

  const inspection = await inspectionService.getInspectionDetail(inspectionId);
  if (!inspection) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Inspection "${inspectionId}" was not found.` } });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, inspection.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateCreateFindingFromResponse(req.body);
  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  value.createdBy = req.user!.name;

  const result = await findingService.createFindingFromInspectionResponse(inspectionId, questionId, value);

  if (!result.ok) {
    if (result.error === 'INSPECTION_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Inspection "${inspectionId}" was not found.` } });
      return;
    }
    if (result.error === 'RESPONSE_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: `Question "${questionId}" has no recorded response.` } });
      return;
    }
    res.status(400).json({
      error: { code: 'NO_POTENTIAL_FINDING', message: 'This response was not flagged as a potential finding.' },
    });
    return;
  }

  if (!result.reused) {
    await notifyFindingAssigned(result.finding, req.user!.name);
  }
  res.status(result.reused ? 200 : 201).json({ data: result.finding });
}

export async function updateFindingHandler(req: Request, res: Response): Promise<void> {
  if (!canManageFinding(req.user!.role)) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Your role cannot update findings.' } });
    return;
  }

  const id = req.params.id as string;
  const existing = await findingService.getFindingDetail(id);

  if (!existing) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Finding "${id}" was not found.`,
      },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateUpdateFinding(req.body);

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

  const updated = await findingService.updateFinding(id, existing, value);

  if (updated) {
    if (value.assignedTo !== undefined && value.assignedTo !== existing.assignedTo) {
      await notifyFindingAssigned(updated, req.user!.name);
    }
    if (value.status !== undefined && value.status !== existing.status) {
      await notifyFindingStatusChanged(updated, existing.status, req.user!.name);
    }
  }

  res.json({ data: updated });
}

export async function addCommentHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await findingService.getFindingDetail(id);

  if (!existing) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Finding "${id}" was not found.`,
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

  const comment = await findingService.addComment(id, value);
  res.status(201).json({ data: comment });
}

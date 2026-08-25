import type { Request, Response } from 'express';
import * as findingService from './service';
import * as inspectionService from '../inspections/service';
import { validateComment, validateCreateFinding, validateCreateFindingFromResponse, validateUpdateFinding } from './schema';
import { canAccessRecordWorkplace, canManageFinding, workplaceScopeWhere } from '../auth/permissions';

function forbiddenWorkplace(res: Response): void {
  res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'You do not have access to this workplace.' },
  });
}

export async function listFindingsHandler(req: Request, res: Response): Promise<void> {
  const hazardId = typeof req.query.hazardId === 'string' ? req.query.hazardId : undefined;
  const inspectionId = typeof req.query.inspectionId === 'string' ? req.query.inspectionId : undefined;
  res.json({ data: await findingService.listFindings({ hazardId, inspectionId, workplace: workplaceScopeWhere(req.user!) }) });
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

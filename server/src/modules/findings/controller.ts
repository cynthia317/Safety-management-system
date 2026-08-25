import type { Request, Response } from 'express';
import * as findingService from './service';
import { validateComment, validateCreateFinding, validateUpdateFinding } from './schema';
import { canAccessRecordWorkplace, canManageFinding, workplaceScopeWhere } from '../auth/permissions';

function forbiddenWorkplace(res: Response): void {
  res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'You do not have access to this workplace.' },
  });
}

export async function listFindingsHandler(req: Request, res: Response): Promise<void> {
  const hazardId = typeof req.query.hazardId === 'string' ? req.query.hazardId : undefined;
  res.json({ data: await findingService.listFindings({ hazardId, workplace: workplaceScopeWhere(req.user!) }) });
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

  const finding = await findingService.createFinding(value);
  res.status(201).json({ data: finding });
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

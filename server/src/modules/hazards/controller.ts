import type { Request, Response } from 'express';
import * as hazardService from './service';
import { validateComment, validateCreateHazard, validateUpdateHazard } from './schema';
import { canAccessRecordWorkplace, canTriageHazard, workplaceScopeWhere } from '../auth/permissions';

function forbiddenWorkplace(res: Response): void {
  res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'You do not have access to this workplace.' },
  });
}

export async function listHazardsHandler(req: Request, res: Response): Promise<void> {
  res.json({ data: await hazardService.listHazards({ workplace: workplaceScopeWhere(req.user!) }) });
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

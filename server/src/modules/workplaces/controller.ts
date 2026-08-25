import type { Request, Response } from 'express';
import * as workplaceService from './service';
import { validateCreateWorkplace, validateUpdateWorkplace } from './schema';
import { canManageWorkplaces } from '../auth/permissions';

function forbidden(res: Response): void {
  res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'Your role cannot manage workplaces.' },
  });
}

export async function listWorkplacesHandler(_req: Request, res: Response): Promise<void> {
  res.json({ data: await workplaceService.listWorkplaces() });
}

export async function getWorkplaceHandler(req: Request, res: Response): Promise<void> {
  const workplace = await workplaceService.getWorkplace(req.params.id as string);

  if (!workplace) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Workplace "${req.params.id}" was not found.` },
    });
    return;
  }

  res.json({ data: workplace });
}

export async function createWorkplaceHandler(req: Request, res: Response): Promise<void> {
  if (!canManageWorkplaces(req.user!.role)) {
    forbidden(res);
    return;
  }

  const { errors, value } = validateCreateWorkplace(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const workplace = await workplaceService.createWorkplace(value);
  res.status(201).json({ data: workplace });
}

export async function updateWorkplaceHandler(req: Request, res: Response): Promise<void> {
  if (!canManageWorkplaces(req.user!.role)) {
    forbidden(res);
    return;
  }

  const id = req.params.id as string;
  const existing = await workplaceService.getWorkplace(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Workplace "${id}" was not found.` },
    });
    return;
  }

  const { errors, value } = validateUpdateWorkplace(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const updated = await workplaceService.updateWorkplace(id, value);
  res.json({ data: updated });
}

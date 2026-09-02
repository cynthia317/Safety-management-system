import type { Request, Response } from 'express';
import * as workplaceService from './service';
import { validateCreateWorkplace, validateUpdateWorkplace } from './schema';
import { canAccessRecordWorkplace, canManageWorkplaces, hasOrgWideAccess } from '../auth/permissions';

function forbidden(res: Response): void {
  res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'Your role cannot manage workplaces.' },
  });
}

function forbiddenWorkplace(res: Response): void {
  res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'You do not have access to this workplace.' },
  });
}

// The Workplace directory (name, code, industry, address, area/location structure, activity
// log) is organisation-wide configuration, but a workplace-scoped user (everyone except
// Admin — see auth/permissions.ts#hasOrgWideAccess) has no legitimate reason to browse
// another site's directory entry, the same principle already applied to every domain
// record (Hazard, Incident, ...) via workplaceScopeWhere/canAccessRecordWorkplace. Scoped
// to the caller's own workplace here too; Admin keeps the full organisation-wide directory.
export async function listWorkplacesHandler(req: Request, res: Response): Promise<void> {
  const nameFilter = hasOrgWideAccess(req.user!.role) ? undefined : req.user!.workplace;
  res.json({ data: await workplaceService.listWorkplaces(nameFilter) });
}

export async function getWorkplaceHandler(req: Request, res: Response): Promise<void> {
  const workplace = await workplaceService.getWorkplace(req.params.id as string);

  if (!workplace) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Workplace "${req.params.id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, workplace.name)) {
    forbiddenWorkplace(res);
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

  const workplace = await workplaceService.createWorkplace(value, req.user!.name);
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

  const updated = await workplaceService.updateWorkplace(id, value, req.user!.name);
  res.json({ data: updated });
}

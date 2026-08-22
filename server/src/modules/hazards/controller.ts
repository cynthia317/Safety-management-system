import type { Request, Response } from 'express';
import * as hazardService from './service';
import { validateComment, validateCreateHazard, validateUpdateHazard } from './schema';

export async function listHazardsHandler(_req: Request, res: Response): Promise<void> {
  res.json({ data: await hazardService.listHazards() });
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

  const hazard = await hazardService.createHazard(value);
  res.status(201).json({ data: hazard });
}

export async function updateHazardHandler(req: Request, res: Response): Promise<void> {
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

  const updated = await hazardService.updateHazard(id, value);
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

  const comment = await hazardService.addComment(id, value);
  res.status(201).json({ data: comment });
}

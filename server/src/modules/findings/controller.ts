import type { Request, Response } from 'express';
import * as findingService from './service';
import { validateComment, validateCreateFinding, validateUpdateFinding } from './schema';

export async function listFindingsHandler(_req: Request, res: Response): Promise<void> {
  res.json({ data: await findingService.listFindings() });
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

  res.json({ data: finding });
}

export async function createFindingHandler(req: Request, res: Response): Promise<void> {
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

  const finding = await findingService.createFinding(value);
  res.status(201).json({ data: finding });
}

export async function updateFindingHandler(req: Request, res: Response): Promise<void> {
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

  const updated = await findingService.updateFinding(id, value);
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

  const comment = await findingService.addComment(id, value);
  res.status(201).json({ data: comment });
}

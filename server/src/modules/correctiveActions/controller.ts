import type { Request, Response } from 'express';
import * as actionService from './service';
import { validateAddEvidence, validateComment, validateCreateCorrectiveAction, validateUpdateCorrectiveAction } from './schema';

export async function listCorrectiveActionsHandler(_req: Request, res: Response): Promise<void> {
  res.json({ data: await actionService.listCorrectiveActions() });
}

export async function getCorrectiveActionHandler(req: Request, res: Response): Promise<void> {
  const action = await actionService.getCorrectiveActionDetail(req.params.id as string);

  if (!action) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Corrective action "${req.params.id}" was not found.` },
    });
    return;
  }

  res.json({ data: action });
}

export async function createCorrectiveActionHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateCreateCorrectiveAction(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const action = await actionService.createCorrectiveAction(value);
  res.status(201).json({ data: action });
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

  const { errors, value } = validateUpdateCorrectiveAction(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const updated = await actionService.updateCorrectiveAction(id, value);
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

  const { errors, value } = validateComment(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

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

  const { errors, value } = validateAddEvidence(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const items = await actionService.addEvidence(id, value.files, value.uploadedBy);
  res.status(201).json({ data: items });
}

export async function getCorrectiveActionStatsHandler(_req: Request, res: Response): Promise<void> {
  res.json({ data: await actionService.getCorrectiveActionStats() });
}

import type { Request, Response } from 'express';
import * as templateService from './service';
import { validateCreateTemplate, validateUpdateTemplate } from './schema';

export async function listTemplatesHandler(_req: Request, res: Response): Promise<void> {
  res.json({ data: await templateService.listTemplates() });
}

export async function getTemplateHandler(req: Request, res: Response): Promise<void> {
  const template = await templateService.getTemplate(req.params.id as string);

  if (!template) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Inspection template "${req.params.id}" was not found.` },
    });
    return;
  }

  res.json({ data: template });
}

export async function createTemplateHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateCreateTemplate(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const template = await templateService.createTemplate(value);
  res.status(201).json({ data: template });
}

export async function updateTemplateHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await templateService.getTemplate(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Inspection template "${id}" was not found.` },
    });
    return;
  }

  const { errors, value } = validateUpdateTemplate(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const updated = await templateService.updateTemplate(id, value);
  res.json({ data: updated });
}

export async function duplicateTemplateHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const duplicate = await templateService.duplicateTemplate(id);

  if (!duplicate) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Inspection template "${id}" was not found.` },
    });
    return;
  }

  res.status(201).json({ data: duplicate });
}

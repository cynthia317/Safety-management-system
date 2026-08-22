import type { Request, Response } from 'express';
import * as riskAssessmentService from './service';
import { validateCreateRiskAssessment, validateUpdateRiskAssessment } from './schema';

export async function listRiskAssessmentsHandler(_req: Request, res: Response): Promise<void> {
  res.json({ data: await riskAssessmentService.listRiskAssessments() });
}

export async function getRiskAssessmentHandler(req: Request, res: Response): Promise<void> {
  const assessment = await riskAssessmentService.getRiskAssessmentDetail(req.params.id as string);

  if (!assessment) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Risk assessment "${req.params.id}" was not found.` },
    });
    return;
  }

  res.json({ data: assessment });
}

export async function createRiskAssessmentHandler(req: Request, res: Response): Promise<void> {
  const { errors, value } = validateCreateRiskAssessment(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const assessment = await riskAssessmentService.createRiskAssessment(value);
  res.status(201).json({ data: assessment });
}

export async function updateRiskAssessmentHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await riskAssessmentService.getRiskAssessmentDetail(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Risk assessment "${id}" was not found.` },
    });
    return;
  }

  const { errors, value } = validateUpdateRiskAssessment(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const updated = await riskAssessmentService.updateRiskAssessment(id, value);
  res.json({ data: updated });
}

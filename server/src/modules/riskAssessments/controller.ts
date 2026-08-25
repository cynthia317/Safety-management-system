import type { Request, Response } from 'express';
import * as riskAssessmentService from './service';
import { validateCreateRiskAssessment, validateUpdateRiskAssessment } from './schema';
import {
  canAccessRecordWorkplace,
  canApproveRiskAssessment,
  canManageRiskAssessments,
  workplaceScopeWhere,
} from '../auth/permissions';

function forbidden(res: Response, message: string): void {
  res.status(403).json({ error: { code: 'FORBIDDEN', message } });
}

function forbiddenWorkplace(res: Response): void {
  forbidden(res, 'You do not have access to this workplace.');
}

// Entering or leaving Approved/Closed is a sign-off — everything else (draft edits,
// moving Draft -> Under Review to request one) is ordinary authoring work.
function isSignOffTransition(fromStatus: string, toStatus: string): boolean {
  return toStatus === 'Approved' || toStatus === 'Closed' || fromStatus === 'Approved' || fromStatus === 'Closed';
}

export async function listRiskAssessmentsHandler(req: Request, res: Response): Promise<void> {
  const hazardId = typeof req.query.hazardId === 'string' ? req.query.hazardId : undefined;
  res.json({
    data: await riskAssessmentService.listRiskAssessments({ hazardId, workplace: workplaceScopeWhere(req.user!) }),
  });
}

export async function getRiskAssessmentHandler(req: Request, res: Response): Promise<void> {
  const assessment = await riskAssessmentService.getRiskAssessmentDetail(req.params.id as string);

  if (!assessment) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Risk assessment "${req.params.id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, assessment.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  res.json({ data: assessment });
}

export async function createRiskAssessmentHandler(req: Request, res: Response): Promise<void> {
  if (!canManageRiskAssessments(req.user!.role)) {
    forbidden(res, 'Your role cannot create risk assessments.');
    return;
  }

  const { errors, value } = validateCreateRiskAssessment(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, value.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const result = await riskAssessmentService.createRiskAssessment(value);
  if ('error' in result) {
    res.status(400).json({ error: { code: 'INVALID_SOURCE_LINK', message: result.error } });
    return;
  }

  res.status(201).json({ data: result });
}

export async function updateRiskAssessmentHandler(req: Request, res: Response): Promise<void> {
  if (!canManageRiskAssessments(req.user!.role)) {
    forbidden(res, 'Your role cannot edit risk assessments.');
    return;
  }

  const id = req.params.id as string;
  const existing = await riskAssessmentService.getRiskAssessmentDetail(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Risk assessment "${id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateUpdateRiskAssessment(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  if (value.workplace !== undefined && !canAccessRecordWorkplace(req.user!, value.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  if (
    value.status !== undefined &&
    value.status !== existing.status &&
    isSignOffTransition(existing.status, value.status) &&
    !canApproveRiskAssessment(req.user!.role)
  ) {
    forbidden(res, 'Your role cannot approve or close risk assessments.');
    return;
  }

  const updated = await riskAssessmentService.updateRiskAssessment(id, value);
  res.json({ data: updated });
}

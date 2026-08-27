import type { Request, Response } from 'express';
import * as riskAssessmentService from './service';
import { validateCreateRiskAssessment, validateUpdateRiskAssessment } from './schema';
import {
  canAccessRecordWorkplace,
  canApproveRiskAssessment,
  canManageRiskAssessments,
  workplaceScopeWhere,
} from '../auth/permissions';
import { notifyUser } from '../notifications/service';
import { excludeActor, resolveUserByName, resolveUsersByRole } from '../notifications/recipients';
import { parsePagination, paginationMeta } from '../../lib/pagination';
import type { RiskAssessment, RiskAssessmentStatus } from './types';
import type { RiskLevel } from './riskMatrix';

const ESCALATION_RISK_LEVELS = ['High', 'Critical'];

async function notifyRiskAssessmentAssigned(assessment: RiskAssessment, actorName: string): Promise<void> {
  const responsible = await resolveUserByName(assessment.assessedBy, assessment.workplace);
  if (!responsible || responsible.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  await notifyUser(responsible, {
    type: 'risk_assessment_assigned',
    subject: `Risk assessment assigned: ${assessment.referenceNumber}`,
    message: `You are responsible for risk assessment ${assessment.referenceNumber}: "${assessment.title}".`,
    relatedEntityType: 'risk_assessment',
    relatedEntityId: assessment.id,
    relatedEntityReference: assessment.referenceNumber,
  });
}

async function notifyRiskAssessmentHighRisk(assessment: RiskAssessment, actorName: string): Promise<void> {
  if (!ESCALATION_RISK_LEVELS.includes(assessment.overallRiskLevel)) return;

  const staff = await resolveUsersByRole(assessment.workplace, ['EHS Officer']);
  const recipients = excludeActor(staff, actorName).filter(
    (r) => r.name.trim().toLowerCase() !== assessment.assessedBy.trim().toLowerCase(),
  );

  await Promise.all(
    recipients.map((recipient) =>
      notifyUser(recipient, {
        type: 'risk_assessment_high_risk',
        subject: `${assessment.overallRiskLevel} risk assessment: ${assessment.referenceNumber}`,
        message: `${assessment.referenceNumber}: "${assessment.title}" carries an overall ${assessment.overallRiskLevel.toLowerCase()} risk rating.`,
        relatedEntityType: 'risk_assessment',
        relatedEntityId: assessment.id,
        relatedEntityReference: assessment.referenceNumber,
        priority: assessment.overallRiskLevel as 'High' | 'Critical',
      }),
    ),
  );
}

async function notifyRiskAssessmentSubmittedForReview(assessment: RiskAssessment, actorName: string): Promise<void> {
  const reviewers = await resolveUsersByRole(assessment.workplace, ['EHS Officer']);
  const recipients = excludeActor(reviewers, actorName);

  await Promise.all(
    recipients.map((recipient) =>
      notifyUser(recipient, {
        type: 'risk_assessment_submitted_for_review',
        subject: `Risk assessment awaiting review: ${assessment.referenceNumber}`,
        message: `${actorName} submitted ${assessment.referenceNumber}: "${assessment.title}" for review.`,
        relatedEntityType: 'risk_assessment',
        relatedEntityId: assessment.id,
        relatedEntityReference: assessment.referenceNumber,
      }),
    ),
  );
}

async function notifyRiskAssessmentApproved(assessment: RiskAssessment, actorName: string): Promise<void> {
  const responsible = await resolveUserByName(assessment.assessedBy, assessment.workplace);
  if (!responsible || responsible.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  await notifyUser(responsible, {
    type: 'risk_assessment_approved',
    subject: `Risk assessment approved: ${assessment.referenceNumber}`,
    message: `${actorName} approved ${assessment.referenceNumber}: "${assessment.title}".`,
    relatedEntityType: 'risk_assessment',
    relatedEntityId: assessment.id,
    relatedEntityReference: assessment.referenceNumber,
  });
}

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

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export async function listRiskAssessmentsHandler(req: Request, res: Response): Promise<void> {
  const pagination = parsePagination(req.query as Record<string, unknown>);
  const assignedToRaw = queryString(req.query.assignedTo);
  const assignedTo = assignedToRaw === 'me' ? req.user!.name : assignedToRaw;

  const scopeWhere = workplaceScopeWhere(req.user!);
  const requestedWorkplace = queryString(req.query.workplace);

  const { items, total } = await riskAssessmentService.listRiskAssessments({
    hazardId: queryString(req.query.hazardId),
    workplace: scopeWhere ?? (requestedWorkplace ? { equals: requestedWorkplace, mode: 'insensitive' } : undefined),
    status: queryString(req.query.status) as RiskAssessmentStatus | undefined,
    riskLevel: queryString(req.query.riskLevel) as RiskLevel | undefined,
    assignedTo: assignedTo ? { equals: assignedTo, mode: 'insensitive' } : undefined,
    search: queryString(req.query.search),
    sort: queryString(req.query.sort) as 'newest' | 'oldest' | undefined,
    pagination,
  });

  res.json({ data: items, ...(pagination ? { meta: paginationMeta(total, pagination) } : {}) });
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

  await Promise.all([
    notifyRiskAssessmentAssigned(result, req.user!.name),
    notifyRiskAssessmentHighRisk(result, req.user!.name),
  ]);
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

  if (updated) {
    if (value.assessedBy !== undefined && value.assessedBy !== existing.assessedBy) {
      await notifyRiskAssessmentAssigned(updated, req.user!.name);
    }
    if (value.status !== undefined && value.status !== existing.status) {
      if (value.status === 'Under Review') {
        await notifyRiskAssessmentSubmittedForReview(updated, req.user!.name);
      } else if (value.status === 'Approved') {
        await notifyRiskAssessmentApproved(updated, req.user!.name);
      }
    }
  }

  res.json({ data: updated });
}

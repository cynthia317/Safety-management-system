import type { Request, Response } from 'express';
import * as inspectionService from './service';
import { validateCreateInspection, validateSaveResponses, validateUpdateInspection } from './schema';
import { canAccessRecordWorkplace, canManageInspections, workplaceScopeWhere } from '../auth/permissions';
import { notifyUser } from '../notifications/service';
import { excludeActor, resolveUserByName, resolveUsersByRole } from '../notifications/recipients';
import type { Inspection } from './types';

async function notifyInspectionAssigned(inspection: Inspection, actorName: string): Promise<void> {
  const inspector = await resolveUserByName(inspection.leadInspector, inspection.workplace);
  if (!inspector || inspector.name.trim().toLowerCase() === actorName.trim().toLowerCase()) return;

  await notifyUser(inspector, {
    type: 'inspection_assigned',
    subject: `Inspection assigned: ${inspection.referenceNumber}`,
    message: `You have been assigned as lead inspector for ${inspection.referenceNumber}: "${inspection.title}", scheduled ${new Date(inspection.inspectionDate).toLocaleDateString()}.`,
    relatedEntityType: 'inspection',
    relatedEntityId: inspection.id,
    relatedEntityReference: inspection.referenceNumber,
  });
}

// The lifecycle only has one review stage (Submitted -> Reviewed) with no named reviewer
// field, so this notifies whoever can act on it (canManageInspections roles) at the
// inspection's workplace, rather than inventing a reviewer assignment that doesn't exist.
async function notifyInspectionSubmitted(inspection: Inspection, actorName: string): Promise<void> {
  const reviewers = await resolveUsersByRole(inspection.workplace, ['Supervisor', 'EHS Officer']);
  const recipients = excludeActor(reviewers, actorName);

  await Promise.all(
    recipients.map((recipient) =>
      notifyUser(recipient, {
        type: 'inspection_submitted',
        subject: `Inspection submitted for review: ${inspection.referenceNumber}`,
        message: `${actorName} submitted ${inspection.referenceNumber}: "${inspection.title}" for review.`,
        relatedEntityType: 'inspection',
        relatedEntityId: inspection.id,
        relatedEntityReference: inspection.referenceNumber,
      }),
    ),
  );
}

function forbidden(res: Response, message: string): void {
  res.status(403).json({ error: { code: 'FORBIDDEN', message } });
}

function forbiddenWorkplace(res: Response): void {
  forbidden(res, 'You do not have access to this workplace.');
}

export async function listInspectionsHandler(req: Request, res: Response): Promise<void> {
  res.json({ data: await inspectionService.listInspections(workplaceScopeWhere(req.user!)) });
}

export async function getInspectionHandler(req: Request, res: Response): Promise<void> {
  const inspection = await inspectionService.getInspectionDetail(req.params.id as string);

  if (!inspection) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Inspection "${req.params.id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, inspection.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  res.json({ data: inspection });
}

export async function createInspectionHandler(req: Request, res: Response): Promise<void> {
  if (!canManageInspections(req.user!.role)) {
    forbidden(res, 'Your role cannot schedule inspections.');
    return;
  }

  const { errors, value } = validateCreateInspection(req.body);

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

  const result = await inspectionService.createInspection(value, value.leadInspector);

  if ('error' in result) {
    res.status(400).json({ error: { code: 'INVALID_TEMPLATE', message: result.error } });
    return;
  }

  await notifyInspectionAssigned(result, req.user!.name);
  res.status(201).json({ data: result });
}

// Editing inspection metadata (site/date/inspectors/purpose) and moving it to
// Reviewed/Closed is a supervisory action — conducting one (answering questions) goes
// through saveResponsesHandler/submitInspectionHandler below instead, which stay open to
// any workplace-scoped user, matching "Workers can participate in permitted inspections."
export async function updateInspectionHandler(req: Request, res: Response): Promise<void> {
  if (!canManageInspections(req.user!.role)) {
    forbidden(res, 'Your role cannot edit or review inspections.');
    return;
  }

  const id = req.params.id as string;
  const existing = await inspectionService.getInspectionDetail(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Inspection "${id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateUpdateInspection(req.body);

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

  const updated = await inspectionService.updateInspection(id, value);

  if (updated && value.leadInspector !== undefined && value.leadInspector !== existing.leadInspector) {
    await notifyInspectionAssigned(updated, req.user!.name);
  }

  res.json({ data: updated });
}

export async function saveResponsesHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await inspectionService.getInspectionDetail(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Inspection "${id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  const { errors, value } = validateSaveResponses(req.body);

  if (errors) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', details: errors },
    });
    return;
  }

  const isLocked = existing.status === 'Submitted' || existing.status === 'Reviewed' || existing.status === 'Closed';

  if (isLocked) {
    // Once locked, the answer itself (value/notes/evidence) is frozen, but
    // potential findings still need to be dismissed or marked as created —
    // allow the save only if it doesn't touch any answer content.
    const touchesAnswerContent = value.responses.some((r) => {
      const current = existing.responses.find((er) => er.questionId === r.questionId);
      if (!current) return true;
      return current.value !== r.value || current.notes !== r.notes || current.evidenceNote !== r.evidenceNote;
    });

    if (touchesAnswerContent) {
      res.status(400).json({
        error: { code: 'LOCKED', message: 'This inspection has been submitted and can no longer be edited.' },
      });
      return;
    }
  }

  const updated = await inspectionService.saveResponses(id, value);
  res.json({ data: updated });
}

export async function submitInspectionHandler(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const existing = await inspectionService.getInspectionDetail(id);

  if (!existing) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Inspection "${id}" was not found.` },
    });
    return;
  }

  if (!canAccessRecordWorkplace(req.user!, existing.workplace)) {
    forbiddenWorkplace(res);
    return;
  }

  // Actor is always the authenticated caller — every other module derives it from the
  // session rather than trusting the client, and submit shouldn't be the one exception.
  const result = await inspectionService.submitInspection(id, req.user!.name);

  if (!result) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Inspection "${id}" was not found.` },
    });
    return;
  }

  if (!result.ok) {
    res.status(400).json({
      error: {
        code: 'INCOMPLETE',
        message: `${result.missing.length} required question${result.missing.length === 1 ? '' : 's'} still need${result.missing.length === 1 ? 's' : ''} a response.`,
      },
      missing: result.missing,
    });
    return;
  }

  await notifyInspectionSubmitted(result.inspection, req.user!.name);
  res.json({ data: result.inspection });
}

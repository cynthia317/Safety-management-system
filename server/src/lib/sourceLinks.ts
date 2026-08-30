import { prisma } from './prisma';

export type SourceLinkError = 'NOT_FOUND' | 'WORKPLACE_MISMATCH';

export interface ResolvedSource {
  id: string;
  referenceNumber: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Confirms a record referenced by id (hazardId/findingId/inspectionId/riskAssessmentId on
 * a create payload) both exists and belongs to the same workplace as the record being
 * created. This is a data-integrity check, not an authorization one — it runs for every
 * caller including Admin, since a Finding at Site A citing a Hazard at Site B is
 * incoherent regardless of who is allowed to see both sites (Phase 1's workplace-scope
 * checks are the separate, permission-focused layer this sits alongside).
 */
async function validateLink(
  row: { id: string; referenceNumber: string; workplace: string } | null,
  workplace: string,
): Promise<ResolvedSource | SourceLinkError> {
  if (!row) return 'NOT_FOUND';
  if (normalize(row.workplace) !== normalize(workplace)) return 'WORKPLACE_MISMATCH';
  return { id: row.id, referenceNumber: row.referenceNumber };
}

export async function validateHazardLink(hazardId: string, workplace: string): Promise<ResolvedSource | SourceLinkError> {
  const row = await prisma.hazardReport.findUnique({
    where: { id: hazardId },
    select: { id: true, referenceNumber: true, workplace: true },
  });
  return validateLink(row, workplace);
}

export async function validateFindingLink(findingId: string, workplace: string): Promise<ResolvedSource | SourceLinkError> {
  const row = await prisma.finding.findUnique({
    where: { id: findingId },
    select: { id: true, referenceNumber: true, workplace: true },
  });
  return validateLink(row, workplace);
}

export async function validateInspectionLink(inspectionId: string, workplace: string): Promise<ResolvedSource | SourceLinkError> {
  const row = await prisma.inspection.findUnique({
    where: { id: inspectionId },
    select: { id: true, referenceNumber: true, workplace: true },
  });
  return validateLink(row, workplace);
}

export async function validateRiskAssessmentLink(riskAssessmentId: string, workplace: string): Promise<ResolvedSource | SourceLinkError> {
  const row = await prisma.riskAssessment.findUnique({
    where: { id: riskAssessmentId },
    select: { id: true, referenceNumber: true, workplace: true },
  });
  return validateLink(row, workplace);
}

export async function validateIncidentLink(incidentId: string, workplace: string): Promise<ResolvedSource | SourceLinkError> {
  const row = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { id: true, referenceNumber: true, workplace: true },
  });
  return validateLink(row, workplace);
}

export function sourceLinkErrorMessage(error: SourceLinkError, label: string): string {
  return error === 'NOT_FOUND'
    ? `The referenced ${label} could not be found.`
    : `The referenced ${label} belongs to a different workplace.`;
}

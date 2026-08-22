import { INDUSTRY_TAGS } from './inspectionTemplateOptions';
import type { WorkplaceStatus } from './workplaceTypes';

export const WORKPLACE_STATUSES: WorkplaceStatus[] = ['Active', 'Inactive'];

/** Same tag set templates use to describe applicable workplace types — one workplace picks one. */
export const WORKPLACE_INDUSTRY_TAGS: string[] = INDUSTRY_TAGS;

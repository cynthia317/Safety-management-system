import type { Request, Response } from 'express';
import * as dashboardService from './service';
import { workplaceScopeWhere } from '../auth/permissions';

export async function getDashboardSummaryHandler(req: Request, res: Response): Promise<void> {
  res.json({ data: await dashboardService.getDashboardSummary(workplaceScopeWhere(req.user!)) });
}

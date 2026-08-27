import { Router } from 'express';
import { getDashboardSummaryHandler } from './controller';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', getDashboardSummaryHandler);

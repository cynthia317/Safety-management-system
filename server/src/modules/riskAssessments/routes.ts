import { Router } from 'express';
import {
  createRiskAssessmentHandler,
  getRiskAssessmentHandler,
  listRiskAssessmentsHandler,
  updateRiskAssessmentHandler,
} from './controller';

export const riskAssessmentsRouter = Router();

riskAssessmentsRouter.get('/', listRiskAssessmentsHandler);
riskAssessmentsRouter.get('/:id', getRiskAssessmentHandler);
riskAssessmentsRouter.post('/', createRiskAssessmentHandler);
riskAssessmentsRouter.patch('/:id', updateRiskAssessmentHandler);

import { Router } from 'express';
import {
  addCommentHandler,
  addEvidenceHandler,
  createIncidentHandler,
  getIncidentHandler,
  listIncidentsHandler,
  updateIncidentHandler,
} from './controller';
import { writeLimiter } from '../../lib/rateLimiters';

export const incidentsRouter = Router();

incidentsRouter.get('/', listIncidentsHandler);
incidentsRouter.get('/:id', getIncidentHandler);
incidentsRouter.post('/', writeLimiter, createIncidentHandler);
incidentsRouter.patch('/:id', updateIncidentHandler);
incidentsRouter.post('/:id/comments', writeLimiter, addCommentHandler);
incidentsRouter.post('/:id/evidence', writeLimiter, addEvidenceHandler);

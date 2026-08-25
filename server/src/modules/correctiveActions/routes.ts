import { Router } from 'express';
import {
  addCommentHandler,
  addEvidenceHandler,
  createCorrectiveActionHandler,
  getCorrectiveActionHandler,
  getCorrectiveActionStatsHandler,
  listCorrectiveActionsHandler,
  updateCorrectiveActionHandler,
} from './controller';
import { writeLimiter } from '../../lib/rateLimiters';

export const correctiveActionsRouter = Router();

correctiveActionsRouter.get('/', listCorrectiveActionsHandler);
correctiveActionsRouter.get('/stats', getCorrectiveActionStatsHandler);
correctiveActionsRouter.get('/:id', getCorrectiveActionHandler);
correctiveActionsRouter.post('/', writeLimiter, createCorrectiveActionHandler);
correctiveActionsRouter.patch('/:id', updateCorrectiveActionHandler);
correctiveActionsRouter.post('/:id/comments', writeLimiter, addCommentHandler);
correctiveActionsRouter.post('/:id/evidence', writeLimiter, addEvidenceHandler);

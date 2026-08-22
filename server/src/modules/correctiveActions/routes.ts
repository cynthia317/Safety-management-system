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

export const correctiveActionsRouter = Router();

correctiveActionsRouter.get('/', listCorrectiveActionsHandler);
correctiveActionsRouter.get('/stats', getCorrectiveActionStatsHandler);
correctiveActionsRouter.get('/:id', getCorrectiveActionHandler);
correctiveActionsRouter.post('/', createCorrectiveActionHandler);
correctiveActionsRouter.patch('/:id', updateCorrectiveActionHandler);
correctiveActionsRouter.post('/:id/comments', addCommentHandler);
correctiveActionsRouter.post('/:id/evidence', addEvidenceHandler);

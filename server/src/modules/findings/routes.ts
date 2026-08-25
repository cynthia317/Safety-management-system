import { Router } from 'express';
import {
  addCommentHandler,
  createFindingHandler,
  getFindingHandler,
  listFindingsHandler,
  updateFindingHandler,
} from './controller';
import { writeLimiter } from '../../lib/rateLimiters';

export const findingsRouter = Router();

findingsRouter.get('/', listFindingsHandler);
findingsRouter.get('/:id', getFindingHandler);
findingsRouter.post('/', writeLimiter, createFindingHandler);
findingsRouter.patch('/:id', updateFindingHandler);
findingsRouter.post('/:id/comments', writeLimiter, addCommentHandler);

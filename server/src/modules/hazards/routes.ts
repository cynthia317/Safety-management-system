import { Router } from 'express';
import {
  addCommentHandler,
  createHazardHandler,
  getHazardHandler,
  listHazardsHandler,
  updateHazardHandler,
} from './controller';
import { writeLimiter } from '../../lib/rateLimiters';

export const hazardsRouter = Router();

hazardsRouter.get('/', listHazardsHandler);
hazardsRouter.get('/:id', getHazardHandler);
hazardsRouter.post('/', writeLimiter, createHazardHandler);
hazardsRouter.patch('/:id', updateHazardHandler);
hazardsRouter.post('/:id/comments', writeLimiter, addCommentHandler);

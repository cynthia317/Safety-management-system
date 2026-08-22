import { Router } from 'express';
import {
  addCommentHandler,
  createHazardHandler,
  getHazardHandler,
  listHazardsHandler,
  updateHazardHandler,
} from './controller';

export const hazardsRouter = Router();

hazardsRouter.get('/', listHazardsHandler);
hazardsRouter.get('/:id', getHazardHandler);
hazardsRouter.post('/', createHazardHandler);
hazardsRouter.patch('/:id', updateHazardHandler);
hazardsRouter.post('/:id/comments', addCommentHandler);

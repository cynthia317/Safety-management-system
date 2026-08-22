import { Router } from 'express';
import {
  addCommentHandler,
  createFindingHandler,
  getFindingHandler,
  listFindingsHandler,
  updateFindingHandler,
} from './controller';

export const findingsRouter = Router();

findingsRouter.get('/', listFindingsHandler);
findingsRouter.get('/:id', getFindingHandler);
findingsRouter.post('/', createFindingHandler);
findingsRouter.patch('/:id', updateFindingHandler);
findingsRouter.post('/:id/comments', addCommentHandler);

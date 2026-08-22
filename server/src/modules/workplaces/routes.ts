import { Router } from 'express';
import {
  createWorkplaceHandler,
  getWorkplaceHandler,
  listWorkplacesHandler,
  updateWorkplaceHandler,
} from './controller';

export const workplacesRouter = Router();

workplacesRouter.get('/', listWorkplacesHandler);
workplacesRouter.get('/:id', getWorkplaceHandler);
workplacesRouter.post('/', createWorkplaceHandler);
workplacesRouter.patch('/:id', updateWorkplaceHandler);

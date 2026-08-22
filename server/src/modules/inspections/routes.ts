import { Router } from 'express';
import {
  createInspectionHandler,
  getInspectionHandler,
  listInspectionsHandler,
  saveResponsesHandler,
  submitInspectionHandler,
  updateInspectionHandler,
} from './controller';

export const inspectionsRouter = Router();

inspectionsRouter.get('/', listInspectionsHandler);
inspectionsRouter.get('/:id', getInspectionHandler);
inspectionsRouter.post('/', createInspectionHandler);
inspectionsRouter.patch('/:id', updateInspectionHandler);
inspectionsRouter.post('/:id/responses', saveResponsesHandler);
inspectionsRouter.post('/:id/submit', submitInspectionHandler);

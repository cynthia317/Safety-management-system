import { Router } from 'express';
import {
  createInspectionHandler,
  getInspectionHandler,
  listInspectionsHandler,
  saveResponsesHandler,
  submitInspectionHandler,
  updateInspectionHandler,
} from './controller';
import { createFindingFromResponseHandler } from '../findings/controller';

export const inspectionsRouter = Router();

inspectionsRouter.get('/', listInspectionsHandler);
inspectionsRouter.get('/:id', getInspectionHandler);
inspectionsRouter.post('/', createInspectionHandler);
inspectionsRouter.patch('/:id', updateInspectionHandler);
inspectionsRouter.post('/:id/responses', saveResponsesHandler);
inspectionsRouter.post('/:id/submit', submitInspectionHandler);
// Transactionally converts a flagged response's potentialFinding into a real Finding —
// see findings/service.ts#createFindingFromInspectionResponse.
inspectionsRouter.post('/:id/responses/:questionId/finding', createFindingFromResponseHandler);

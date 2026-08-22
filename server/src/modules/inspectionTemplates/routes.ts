import { Router } from 'express';
import {
  createTemplateHandler,
  duplicateTemplateHandler,
  getTemplateHandler,
  listTemplatesHandler,
  updateTemplateHandler,
} from './controller';

export const inspectionTemplatesRouter = Router();

inspectionTemplatesRouter.get('/', listTemplatesHandler);
inspectionTemplatesRouter.get('/:id', getTemplateHandler);
inspectionTemplatesRouter.post('/', createTemplateHandler);
inspectionTemplatesRouter.patch('/:id', updateTemplateHandler);
inspectionTemplatesRouter.post('/:id/duplicate', duplicateTemplateHandler);

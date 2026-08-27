import { Router } from 'express';
import { getMyActionsHandler } from './controller';

export const myActionsRouter = Router();

myActionsRouter.get('/', getMyActionsHandler);

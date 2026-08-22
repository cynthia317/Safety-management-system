import { Router } from 'express';
import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
} from './controller';

export const notificationsRouter = Router();

notificationsRouter.get('/', listNotificationsHandler);
notificationsRouter.post('/read-all', markAllNotificationsReadHandler);
notificationsRouter.post('/:id/read', markNotificationReadHandler);

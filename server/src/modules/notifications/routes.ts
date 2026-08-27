import { Router } from 'express';
import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
  unreadCountHandler,
} from './controller';

export const notificationsRouter = Router();

notificationsRouter.get('/', listNotificationsHandler);
notificationsRouter.get('/unread-count', unreadCountHandler);
notificationsRouter.post('/read-all', markAllNotificationsReadHandler);
notificationsRouter.post('/:id/read', markNotificationReadHandler);

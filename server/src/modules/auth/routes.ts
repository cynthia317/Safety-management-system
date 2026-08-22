import { Router } from 'express';
import {
  adminUpdateUserHandler,
  changePasswordHandler,
  loginHandler,
  listUsersHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  updateProfileHandler,
} from './controller';
import { requireAuth, requireRole } from './middleware';

export const authRouter = Router();

authRouter.post('/register', registerHandler);
authRouter.post('/login', loginHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
authRouter.patch('/me', requireAuth, updateProfileHandler);
authRouter.post('/change-password', requireAuth, changePasswordHandler);

export const usersRouter = Router();

usersRouter.get('/', requireAuth, listUsersHandler);
usersRouter.patch('/:id', requireAuth, requireRole('Admin'), adminUpdateUserHandler);

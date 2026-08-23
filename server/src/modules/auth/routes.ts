import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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

// Credential guessing / account-creation abuse protection. Keyed by IP, not by the
// submitted email, so it can't be used to enumerate whether an account exists.
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
});

export const authRouter = Router();

authRouter.post('/register', authAttemptLimiter, registerHandler);
authRouter.post('/login', authAttemptLimiter, loginHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
authRouter.patch('/me', requireAuth, updateProfileHandler);
authRouter.post('/change-password', requireAuth, changePasswordHandler);

export const usersRouter = Router();

usersRouter.get('/', requireAuth, listUsersHandler);
usersRouter.patch('/:id', requireAuth, requireRole('Admin'), adminUpdateUserHandler);

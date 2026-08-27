import { Router, type NextFunction, type Request, type Response } from 'express';
import crypto from 'crypto';
import { config } from '../../config';
import { runReminderSweep } from './reminders';

// Not session/CSRF-authenticated — the caller is a scheduler (Render Cron Job, an external
// cron service, GitHub Actions, etc.), not a logged-in browser, so there is no Origin
// header or cookie to check. A constant-time comparison against CRON_SECRET is the entire
// authorization boundary; if the secret isn't configured, every request is rejected rather
// than silently allowed.
function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const configured = config.cronSecret;
  if (!configured) {
    res.status(503).json({ error: { code: 'NOT_CONFIGURED', message: 'CRON_SECRET is not configured.' } });
    return;
  }

  const header = req.headers.authorization;
  const presented = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  const presentedBuffer = Buffer.from(presented ?? '');
  const configuredBuffer = Buffer.from(configured);
  const matches =
    presentedBuffer.length === configuredBuffer.length && crypto.timingSafeEqual(presentedBuffer, configuredBuffer);

  if (!matches) {
    res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid or missing scheduler credentials.' } });
    return;
  }

  next();
}

export const schedulerRouter = Router();

schedulerRouter.post('/reminders/run', requireCronSecret, async (_req: Request, res: Response) => {
  const result = await runReminderSweep();
  res.json({ data: result });
});

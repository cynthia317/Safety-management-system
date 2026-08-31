import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { Pool } from 'pg';
import { prisma } from './lib/prisma';
import { config } from './config';
import { hazardsRouter } from './modules/hazards/routes';
import { findingsRouter } from './modules/findings/routes';
import { inspectionTemplatesRouter } from './modules/inspectionTemplates/routes';
import { inspectionsRouter } from './modules/inspections/routes';
import { correctiveActionsRouter } from './modules/correctiveActions/routes';
import { workplacesRouter } from './modules/workplaces/routes';
import { riskAssessmentsRouter } from './modules/riskAssessments/routes';
import { notificationsRouter } from './modules/notifications/routes';
import { schedulerRouter } from './modules/notifications/schedulerRoutes';
import { dashboardRouter } from './modules/dashboard/routes';
import { myActionsRouter } from './modules/myActions/routes';
import { incidentsRouter } from './modules/incidents/routes';
import { authRouter, usersRouter } from './modules/auth/routes';
import { requireAuth } from './modules/auth/middleware';
import { verifyOrigin } from './middleware/csrf';

export function createApp(): Express {
  const app = express();

  // Required for secure cookies to work correctly when the app sits behind a reverse
  // proxy / load balancer (Render, Railway, Fly, Nginx, etc.), which is the normal case
  // in production. Harmless in local dev, where there is no proxy.
  app.set('trust proxy', 1);

  app.use(helmet());

  app.use(
    cors({
      origin: config.clientOrigin,
      credentials: true,
    }),
  );
  // Raised above Express's 100kb default so hazard/corrective-action evidence (sent as
  // base64 data URLs) fits in the body, including PDFs/documents up to 15MB each.
  app.use(express.json({ limit: '50mb' }));

  // Sessions persist to Postgres (their own `session` table, auto-created below) so a
  // restart or redeploy doesn't sign everyone out — the same pool config.databaseUrl
  // uses for every other table.
  const sessionPool = new Pool({ connectionString: config.databaseUrl });
  const PgSession = connectPgSimple(session);

  app.use(
    session({
      store: new PgSession({ pool: sessionPool, tableName: 'session', createTableIfMissing: true }),
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // Client (Vercel) and server (Render/Railway) are different domains in production,
        // so the session cookie must be sent cross-site — that requires SameSite=None, which
        // browsers only honor when Secure is also set. Locally both run on localhost, where
        // Lax is correct and Secure would break plain-HTTP dev.
        sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
        secure: config.nodeEnv === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      // Cheapest possible round-trip that still proves the DB connection is live — no
      // table access, no data, nothing to leak on either success or failure.
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    } catch {
      // Never forward the underlying error (connection string, host, driver detail) —
      // Render's health check only needs "up" vs "down".
      res.status(503).json({ status: 'unavailable', timestamp: new Date().toISOString() });
    }
  });

  // Scheduler endpoint for due-soon/overdue reminders — mounted ahead of verifyOrigin
  // (like /api/health) because its caller is a cron job, not a browser, so it has no
  // Origin/Referer header to check. Authorization is CRON_SECRET (see schedulerRoutes.ts),
  // not session/CSRF, which is exactly why it must stay outside every session-authenticated
  // router below rather than becoming a "public" route on one of them.
  app.use('/api/system', schedulerRouter);

  // Applies to every route below (including auth) — CSRF defense belongs ahead of
  // everything that can mutate state, not just the session-authenticated routes.
  app.use(verifyOrigin);

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);

  app.use('/api/hazards', requireAuth, hazardsRouter);
  app.use('/api/findings', requireAuth, findingsRouter);
  app.use('/api/inspection-templates', requireAuth, inspectionTemplatesRouter);
  app.use('/api/inspections', requireAuth, inspectionsRouter);
  app.use('/api/corrective-actions', requireAuth, correctiveActionsRouter);
  app.use('/api/workplaces', requireAuth, workplacesRouter);
  app.use('/api/risk-assessments', requireAuth, riskAssessmentsRouter);
  app.use('/api/incidents', requireAuth, incidentsRouter);
  app.use('/api/notifications', requireAuth, notificationsRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/my-actions', requireAuth, myActionsRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      },
    });
  });

  // Catches everything an async route handler throws or rejects with — Express 5 forwards
  // rejected promises here automatically. Must take all four params for Express to treat
  // it as an error handler rather than regular middleware.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server] unhandled error:', err);
    if (res.headersSent) return;

    // body-parser's over-limit error (see express.json({ limit }) above) — surfaced as a
    // clear, actionable response rather than falling into the generic 500 below.
    if (typeof err === 'object' && err !== null && 'type' in err && (err as { type?: unknown }).type === 'entity.too.large') {
      res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large. Reduce the number or size of attached files.' },
      });
      return;
    }

    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    });
  });

  return app;
}

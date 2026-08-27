import 'dotenv/config';

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = requireEnv('NODE_ENV', 'development');
const DEV_SESSION_SECRET_FALLBACK = 'safetyos-dev-session-secret-change-me';

if (nodeEnv === 'production' && !process.env.SESSION_SECRET) {
  // Refuse to boot rather than silently signing sessions with the well-known dev
  // secret — that would let anyone forge a valid session cookie for any user.
  throw new Error(
    'SESSION_SECRET must be set in production (the dev fallback is public in this repo\'s source).',
  );
}

export const config = {
  port: Number(requireEnv('PORT', '4000')),
  nodeEnv,
  clientOrigin: requireEnv('CLIENT_ORIGIN', 'http://localhost:5173'),
  sessionSecret: requireEnv('SESSION_SECRET', DEV_SESSION_SECRET_FALLBACK),
  databaseUrl: requireEnv('DATABASE_URL'),
  // Bearer secret for the scheduled reminder endpoint (POST /api/system/reminders/run) —
  // unset by default, which leaves that endpoint permanently rejecting every request (see
  // app.ts) rather than falling back to any guessable default.
  cronSecret: process.env.CRON_SECRET,
};

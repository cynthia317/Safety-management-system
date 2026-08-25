import rateLimit from 'express-rate-limit';

// Credential guessing / account-creation abuse protection. Keyed by IP, not by the
// submitted email, so it can't be used to enumerate whether an account exists.
export const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
});

// Tighter limit for actions that change account security (password change) — these are a
// smaller, more sensitive surface than login itself, so a lower ceiling is safe without
// getting in the way of a legitimate user who mistypes their current password once or twice.
export const sensitiveAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
});

// Generous ceiling for ordinary write traffic (comments, evidence uploads) — high enough
// that a field user photographing several hazards back-to-back never notices it, but low
// enough to blunt a scripted flood of comments/uploads against one record.
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Please slow down and try again shortly.' } },
});

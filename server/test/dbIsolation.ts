/**
 * Pure validation logic for the test-database isolation guard — deliberately separated
 * from test/env.ts's side-effecting setup so it can be unit-tested directly (no real
 * database connection, no environment mutation) in db-isolation-guard.test.ts. Never logs
 * or includes either connection string in its own output — callers must not either.
 */

export class TestDatabaseIsolationError extends Error {}

/** host + database name, ignoring credentials/query params — used only for the defense-in-
 * depth comparison below, never logged. Falls back to the raw string if parsing fails
 * (still a valid, safe basis for equality comparison, just less precise). */
function dbIdentity(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url;
  }
}

export interface IsolationCheckInput {
  /** process.env.TEST_DATABASE_URL, as read by the caller. */
  testUrl: string | undefined;
  /** The production DATABASE_URL value, read by the caller WITHOUT loading it into
   * process.env (see test/env.ts) — used only for comparison, never connected to. */
  prodUrl: string | undefined;
}

/**
 * Throws TestDatabaseIsolationError (never returns normally on failure) unless:
 *   1. testUrl is present, AND
 *   2. testUrl is not string-equal to prodUrl, AND
 *   3. testUrl does not resolve to the same host+database as prodUrl (defense in depth —
 *      catches the case where the two connection strings differ only in credentials or
 *      query params but point at the same physical database).
 */
export function assertTestDatabaseIsolated({ testUrl, prodUrl }: IsolationCheckInput): void {
  if (!testUrl || testUrl.trim().length === 0) {
    throw new TestDatabaseIsolationError(
      'TEST_DATABASE_URL is required for database tests.\nRefusing to fall back to DATABASE_URL.',
    );
  }

  if (prodUrl && testUrl === prodUrl) {
    throw new TestDatabaseIsolationError(
      'TEST_DATABASE_URL is identical to the production DATABASE_URL.\n' +
        'Refusing to run tests against the production database.',
    );
  }

  if (prodUrl && dbIdentity(testUrl) === dbIdentity(prodUrl)) {
    throw new TestDatabaseIsolationError(
      'TEST_DATABASE_URL resolves to the same host and database name as the production ' +
        'DATABASE_URL (the connection strings differ only in credentials or parameters).\n' +
        'Refusing to run tests against what appears to be the production database.',
    );
  }
}

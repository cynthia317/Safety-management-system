import { describe, expect, it } from 'vitest';
import { assertTestDatabaseIsolated, TestDatabaseIsolationError } from './dbIsolation';

/**
 * Unit tests for the pure guard logic behind test/env.ts's fail-closed database
 * isolation — deliberately independent of any real database connection or environment
 * mutation, so these run (and must pass) even when TEST_DATABASE_URL itself is not
 * configured; they are what proves the guard's own logic is correct in that situation.
 */
describe('Test-database isolation guard (pure logic)', () => {
  it('A. throws when TEST_DATABASE_URL is missing — refuses to fall back to DATABASE_URL', () => {
    expect(() => assertTestDatabaseIsolated({ testUrl: undefined, prodUrl: 'postgresql://prod-host/proddb' })).toThrow(
      TestDatabaseIsolationError,
    );
    expect(() => assertTestDatabaseIsolated({ testUrl: undefined, prodUrl: 'postgresql://prod-host/proddb' })).toThrow(
      /TEST_DATABASE_URL is required/,
    );
  });

  it('A2. throws when TEST_DATABASE_URL is an empty/whitespace string', () => {
    expect(() => assertTestDatabaseIsolated({ testUrl: '   ', prodUrl: 'postgresql://prod-host/proddb' })).toThrow(
      TestDatabaseIsolationError,
    );
  });

  it('B. throws when TEST_DATABASE_URL is identical to DATABASE_URL', () => {
    const same = 'postgresql://user:pass@prod-host/proddb';
    expect(() => assertTestDatabaseIsolated({ testUrl: same, prodUrl: same })).toThrow(TestDatabaseIsolationError);
    expect(() => assertTestDatabaseIsolated({ testUrl: same, prodUrl: same })).toThrow(/identical to the production/);
  });

  it('B2 (defense in depth). throws when the two URLs differ only in credentials/params but resolve to the same host+database', () => {
    const prod = 'postgresql://produser:prodpass@shared-host.neon.tech/shareddb?sslmode=require';
    const testUrlSameTarget = 'postgresql://otheruser:otherpass@shared-host.neon.tech/shareddb?sslmode=require&other=1';
    expect(() => assertTestDatabaseIsolated({ testUrl: testUrlSameTarget, prodUrl: prod })).toThrow(
      TestDatabaseIsolationError,
    );
    expect(() => assertTestDatabaseIsolated({ testUrl: testUrlSameTarget, prodUrl: prod })).toThrow(
      /same host and database name/,
    );
  });

  it('does not throw for a genuinely distinct test database', () => {
    const prod = 'postgresql://produser:prodpass@prod-host.neon.tech/proddb';
    const test = 'postgresql://testuser:testpass@test-host.neon.tech/testdb';
    expect(() => assertTestDatabaseIsolated({ testUrl: test, prodUrl: prod })).not.toThrow();
  });

  it('does not throw when prodUrl is unavailable for comparison (still requires testUrl to be present)', () => {
    expect(() => assertTestDatabaseIsolated({ testUrl: 'postgresql://test-host/testdb', prodUrl: undefined })).not.toThrow();
  });
});

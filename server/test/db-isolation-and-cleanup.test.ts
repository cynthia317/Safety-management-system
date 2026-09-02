import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import * as authService from '../src/modules/auth/service';
import { TEST_RUN_PREFIX, cleanupAllTestData, testEmail, testWorkplaceName } from './helpers';

/**
 * Real-database integration proof for the test-isolation architecture. Requires
 * TEST_DATABASE_URL to be configured (see test/env.ts) — like every other file under
 * test/, vitest's setupFiles gate refuses to run ANY test, including this one, if it
 * isn't, so this file is never at risk of running against production regardless of
 * whether it's specifically about isolation or not.
 */
describe('Database isolation and NotificationEvent cleanup (real DB)', () => {
  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('C/D. the application Prisma singleton (used by every controller/service, and by test helpers) is connected to TEST_DATABASE_URL, not production', async () => {
    // Same `prisma` import test/helpers.ts uses, same one every service module under
    // src/modules/*/service.ts uses — there is exactly one Prisma Client in this process
    // (see src/lib/prisma.ts), so proving its connection target here proves both C and D
    // simultaneously: there is no second "app" client to diverge from this one.
    expect(process.env.TEST_DATABASE_URL).toBeTruthy();
    expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);

    const expectedDbName = new URL(process.env.TEST_DATABASE_URL!).pathname.replace(/^\//, '');
    const rows = await prisma.$queryRaw<{ current_database: string }[]>`SELECT current_database()`;
    expect(rows[0]?.current_database).toBe(expectedDbName);
  });

  it('E/F. cleanupAllTestData removes a test-marked NotificationEvent but preserves a legitimate one', async () => {
    const workplace = testWorkplaceName('CleanupBug');
    const testUser = await authService.createUser({
      name: 'Cleanup Bug Test Recipient',
      email: testEmail('cleanup-bug'),
      password: 'Test-password-123!',
      role: 'Worker',
      workplace,
    });

    // Case 1: marker is in `workplace` (the actual, previously-broken bug this fix
    // addresses) — recipient name deliberately does NOT contain TEST_RUN_PREFIX, proving
    // cleanup no longer depends on that field.
    const testMarkedByWorkplace = await prisma.notificationEvent.create({
      data: {
        type: 'test-marker-workplace',
        recipient: 'Cleanup Bug Test Recipient',
        recipientId: testUser.id,
        workplace,
        subject: 'test',
        message: 'test',
        relatedEntityType: 'Hazard',
        relatedEntityId: 'irrelevant',
        relatedEntityReference: 'irrelevant',
      },
    });

    // Case 2: marker is only reachable via the recipient's own email (workplace null) —
    // proves the OR clause's second branch.
    const testMarkedByRecipientEmail = await prisma.notificationEvent.create({
      data: {
        type: 'test-marker-recipient-email',
        recipient: 'Cleanup Bug Test Recipient',
        recipientId: testUser.id,
        workplace: null,
        subject: 'test',
        message: 'test',
        relatedEntityType: 'Hazard',
        relatedEntityId: 'irrelevant',
        relatedEntityReference: 'irrelevant',
      },
    });

    // A legitimate-looking notification — no TEST_RUN_PREFIX anywhere (workplace, or the
    // recipient it's linked to) — must survive cleanup untouched.
    const legitimate = await prisma.notificationEvent.create({
      data: {
        type: 'legitimate',
        recipient: 'Not A Test User',
        workplace: 'Main Plant',
        subject: 'legitimate notification',
        message: 'must not be deleted by cleanup',
        relatedEntityType: 'Hazard',
        relatedEntityId: 'irrelevant',
        relatedEntityReference: 'irrelevant',
      },
    });

    await cleanupAllTestData();

    const [stillMarkedByWorkplace, stillMarkedByEmail, stillLegitimate] = await Promise.all([
      prisma.notificationEvent.findUnique({ where: { id: testMarkedByWorkplace.id } }),
      prisma.notificationEvent.findUnique({ where: { id: testMarkedByRecipientEmail.id } }),
      prisma.notificationEvent.findUnique({ where: { id: legitimate.id } }),
    ]);

    expect(stillMarkedByWorkplace).toBeNull();
    expect(stillMarkedByEmail).toBeNull();
    expect(stillLegitimate).not.toBeNull();
    expect(stillLegitimate?.message).toBe('must not be deleted by cleanup');

    // Clean up the legitimate row ourselves — cleanupAllTestData correctly won't touch it.
    await prisma.notificationEvent.delete({ where: { id: legitimate.id } });
  });

  it(`sanity: TEST_RUN_PREFIX for this run is namespaced (${TEST_RUN_PREFIX})`, () => {
    expect(TEST_RUN_PREFIX.startsWith('__phase1_test_')).toBe(true);
  });
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 30000,
    // beforeAll hooks in these tests create several users (bcrypt hashing + a real HTTP
    // login round trip against the dev database each time) — generous enough that normal
    // network latency to a remote dev DB doesn't flake the suite.
    hookTimeout: 60000,
    // These tests hit a real Postgres database (see test/helpers.ts) rather than a mock —
    // running them sequentially in one process avoids concurrent test files racing on the
    // same reference-number counters and keeps failures easy to attribute.
    fileParallelism: false,
  },
});

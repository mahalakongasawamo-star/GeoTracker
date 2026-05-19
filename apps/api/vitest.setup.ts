// Vitest globally loads this before each test file. Provides the minimum env
// required by src/env.ts so unit tests can import modules that pull in env
// without hitting a real database.
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgres://test:test@localhost:5432/test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? "test-secret-test-secret-test-secret-";
process.env.NODE_ENV = "test";

// Integration runs flip INTEGRATION=1 so describe.skipIf gates in
// *.integration.test.ts files engage. Real DATABASE_URL / REDIS_URL come
// from the developer's .env via dotenv — see docs/VERIFICATION.md.
import "dotenv/config";

process.env.INTEGRATION = "1";
// Run under NODE_ENV=test so the mock adapter skips its simulated latency
// loop; integration runs already pay real DB + Redis round-trip cost and
// we don't need fake jitter on top.
process.env.NODE_ENV = "test";

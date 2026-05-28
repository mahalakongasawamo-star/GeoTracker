import { env } from "./env.js";
import { getAdapterReport } from "./llm/index.js";
import { startAuditWorker } from "./orchestrator/queue.js";
import { startPulseScheduler } from "./pulse/scheduler.js";
import { buildServer } from "./server.js";

async function main() {
  const app = await buildServer();
  const auditWorker = startAuditWorker();
  const pulseWorker = startPulseScheduler();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    await auditWorker.close();
    await pulseWorker.close();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  const report = getAdapterReport();
  app.log.info({ port: env.API_PORT, ...report }, "api up");
  if (report.disabled.length > 0) {
    app.log.info(
      { disabled: report.disabled, enabled: report.enabled },
      "LLM_ENABLED_PROVIDERS narrowed the audit scope; disabled providers will not be queried",
    );
  }
  if (report.realAdaptersEnabled && report.mockFallback.length > 0) {
    app.log.warn(
      { mockFallback: report.mockFallback },
      "LLM_USE_REAL_ADAPTERS=true but some enabled providers have no API key and will serve mock data",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

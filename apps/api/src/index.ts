import { env } from "./env.js";
import { startAuditWorker } from "./orchestrator/queue.js";
import { buildServer } from "./server.js";

async function main() {
  const app = await buildServer();
  const worker = startAuditWorker();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    await worker.close();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
  app.log.info(
    { port: env.API_PORT, llmAdapters: env.LLM_USE_REAL_ADAPTERS ? "real" : "mock" },
    "api up",
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

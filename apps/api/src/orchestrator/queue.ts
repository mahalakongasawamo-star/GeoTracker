import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../env.js";
import { runAudit, type RunAuditInput } from "./runAudit.js";

const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const auditQueue = new Queue<RunAuditInput>("audits", { connection });

export function startAuditWorker() {
  return new Worker<RunAuditInput>(
    "audits",
    async (job) => {
      await runAudit(job.data);
    },
    { connection, concurrency: 10 },
  );
}

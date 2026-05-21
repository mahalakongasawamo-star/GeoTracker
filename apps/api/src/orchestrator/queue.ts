import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../env.js";
import { runAudit, type RunAuditInput } from "./runAudit.js";

// BullMQ recommends a dedicated connection for the Worker (its blocking
// BRPOPLPUSH would starve any other client sharing the socket) and a
// separate one for the Queue producer. Sharing them also makes graceful
// shutdown ambiguous — close() on one side throws when the other tries
// to use the already-closed socket.
const queueConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export const auditQueue = new Queue<RunAuditInput>("audits", { connection: queueConnection });

export function startAuditWorker() {
  const workerConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return new Worker<RunAuditInput>(
    "audits",
    async (job) => {
      await runAudit(job.data);
    },
    { connection: workerConnection, concurrency: 10 },
  );
}

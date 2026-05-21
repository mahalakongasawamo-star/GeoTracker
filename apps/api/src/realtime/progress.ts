import IORedis from "ioredis";
import type { ProgressEvent } from "@geotracker/shared";
import { env } from "../env.js";

let publisher: IORedis | null = null;

function getPublisher(): IORedis {
  if (!publisher) publisher = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return publisher;
}

function channelFor(auditId: string): string {
  return `geotracker:audit:${auditId}`;
}

export async function publishProgress(auditId: string, event: ProgressEvent): Promise<void> {
  await getPublisher().publish(channelFor(auditId), JSON.stringify(event));
}

// Test-only: tear down the module-level publisher so vitest can exit
// cleanly. Production paths leave it open for the life of the process.
export async function closeProgressPublisher(): Promise<void> {
  if (publisher) {
    const p = publisher;
    publisher = null;
    await p.quit().catch(() => {
      /* already closed */
    });
  }
}

export function subscribeProgress(
  auditId: string,
  onEvent: (event: ProgressEvent) => void,
): () => Promise<void> {
  const sub = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  // Swallow the "Connection is closed" error that fires when the caller
  // tears the subscriber down mid-flight (common on SSE disconnects); the
  // calling code already handles the lifecycle via the returned async
  // unsubscribe, so this prevents a stray unhandledRejection.
  sub.on("error", () => {
    /* expected during teardown */
  });
  const channel = channelFor(auditId);
  void sub.subscribe(channel);
  sub.on("message", (chan, message) => {
    if (chan !== channel) return;
    try {
      onEvent(JSON.parse(message) as ProgressEvent);
    } catch {
      /* ignore malformed */
    }
  });
  return async () => {
    await sub.unsubscribe(channel);
    await sub.quit();
  };
}

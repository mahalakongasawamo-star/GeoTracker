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

export function subscribeProgress(
  auditId: string,
  onEvent: (event: ProgressEvent) => void,
): () => Promise<void> {
  const sub = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
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

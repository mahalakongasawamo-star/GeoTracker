import type { LlmProvider } from "@geotracker/shared";
import type { LlmFailureCode, LlmResponse } from "./types.js";

const DEFAULT_TIMEOUT_MS = 12_000;

export interface HttpQueryJsonInput {
  url: string;
  init: RequestInit;
  provider: LlmProvider;
  timeoutMs?: number;
  /** Single-shot retry on 429 / 503. Default true. */
  retryTransient?: boolean;
}

export interface HttpQueryJsonResult<T> {
  ok: true;
  data: T;
  latencyMs: number;
}

export type HttpQueryJsonError = Extract<LlmResponse, { ok: false }>;

function mapStatusToFailure(status: number): LlmFailureCode {
  if (status === 429) return "rate_limited";
  if (status === 408 || status === 504) return "timeout";
  if (status >= 500) return "network";
  if (status === 451 || status === 403) return "tos";
  return "unknown";
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const secs = Number(value);
  if (Number.isFinite(secs) && secs > 0) return Math.min(secs * 1000, 4000);
  return null;
}

async function attemptOnce<T>(
  input: HttpQueryJsonInput,
  remainingMs: number,
): Promise<
  | HttpQueryJsonResult<T>
  | { ok: false; transient: boolean; status: number; retryAfterMs: number | null; failure: HttpQueryJsonError }
  | { ok: false; transient: true; status: 0; retryAfterMs: null; failure: HttpQueryJsonError }
> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), remainingMs);
  const start = Date.now();
  try {
    const res = await fetch(input.url, { ...input.init, signal: controller.signal });
    if (!res.ok) {
      const transient = res.status === 429 || res.status === 503;
      return {
        ok: false,
        transient,
        status: res.status,
        retryAfterMs: transient ? parseRetryAfter(res.headers.get("retry-after")) : null,
        failure: {
          ok: false,
          provider: input.provider,
          source: "real",
          reason: mapStatusToFailure(res.status),
          message: `${input.provider} ${res.status}`,
        },
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data, latencyMs: Date.now() - start };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      transient: !aborted,
      status: 0,
      retryAfterMs: null,
      failure: {
        ok: false,
        provider: input.provider,
        source: "real",
        reason: aborted ? "timeout" : "network",
        message: err instanceof Error ? err.message : "network error",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function httpQueryJson<T>(
  input: HttpQueryJsonInput,
): Promise<HttpQueryJsonResult<T> | HttpQueryJsonError> {
  const totalBudget = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const start = Date.now();

  const first = await attemptOnce<T>(input, totalBudget);
  if (first.ok) return first;

  const retryEnabled = input.retryTransient !== false;
  if (!retryEnabled || !first.transient) return first.failure;

  const elapsed = Date.now() - start;
  const remaining = totalBudget - elapsed;
  // Don't retry if we don't have a meaningful budget left after the backoff.
  const wait = first.retryAfterMs ?? 500;
  if (remaining - wait < 500) return first.failure;
  // Skip the synthetic backoff under NODE_ENV=test so test suites stay fast.
  if (process.env.NODE_ENV !== "test") {
    await new Promise((r) => setTimeout(r, wait));
  }

  const second = await attemptOnce<T>(input, totalBudget - (Date.now() - start));
  if (second.ok) return second;
  return second.failure;
}

import type { LlmProvider } from "@geotracker/shared";
import type { LlmFailureCode, LlmResponse } from "./types.js";

const DEFAULT_TIMEOUT_MS = 12_000;

export interface HttpQueryJsonInput {
  url: string;
  init: RequestInit;
  provider: LlmProvider;
  timeoutMs?: number;
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

export async function httpQueryJson<T>(
  input: HttpQueryJsonInput,
): Promise<HttpQueryJsonResult<T> | HttpQueryJsonError> {
  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(input.url, { ...input.init, signal: controller.signal });
    if (!res.ok) {
      return {
        ok: false,
        provider: input.provider,
        reason: mapStatusToFailure(res.status),
        message: `${input.provider} ${res.status}`,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data, latencyMs: Date.now() - start };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      provider: input.provider,
      reason: aborted ? "timeout" : "network",
      message: err instanceof Error ? err.message : "network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

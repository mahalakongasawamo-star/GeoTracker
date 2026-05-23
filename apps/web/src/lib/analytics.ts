import posthog from "posthog-js";

const KEY = import.meta.env.PUBLIC_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.PUBLIC_POSTHOG_HOST as string | undefined) ||
  "https://us.i.posthog.com";

function ensureInit(): boolean {
  if (typeof window === "undefined") return false;
  if (!KEY) return false;
  const ph = posthog as unknown as { __loaded?: boolean };
  if (!ph.__loaded) {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: true,
      persistence: "localStorage",
    });
  }
  return true;
}

export function initAnalytics(): void {
  ensureInit();
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (!ensureInit()) return;
  posthog.capture(event, props);
}

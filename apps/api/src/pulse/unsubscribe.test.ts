import { describe, expect, it } from "vitest";
import { buildUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe.js";

describe("unsubscribe tokens", () => {
  it("round-trips a valid token", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    const token = buildUnsubscribeToken(id);
    expect(verifyUnsubscribeToken(token)).toBe(id);
  });

  it("rejects a tampered token", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    const token = buildUnsubscribeToken(id);
    const parts = token.split(".");
    parts[parts.length - 1] = "tampered_signature_value";
    expect(verifyUnsubscribeToken(parts.join("."))).toBeNull();
  });

  it("rejects a malformed token", () => {
    expect(verifyUnsubscribeToken("nope")).toBeNull();
    expect(verifyUnsubscribeToken("a.b")).toBeNull();
  });
});

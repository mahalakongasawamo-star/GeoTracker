import { describe, expect, it } from "vitest";
import { buildSessionCookieValue, readUserIdFromCookie } from "./session.js";

describe("session cookie", () => {
  it("round-trips a user id", () => {
    const uid = "user-abc";
    const cookie = buildSessionCookieValue(uid);
    expect(readUserIdFromCookie(cookie)).toBe(uid);
  });

  it("rejects undefined and empty", () => {
    expect(readUserIdFromCookie(undefined)).toBeNull();
    expect(readUserIdFromCookie("")).toBeNull();
  });

  it("rejects a tampered signature", () => {
    const cookie = buildSessionCookieValue("user-abc");
    const parts = cookie.split(".");
    parts[parts.length - 1] = "tampered_signature_value";
    expect(readUserIdFromCookie(parts.join("."))).toBeNull();
  });
});

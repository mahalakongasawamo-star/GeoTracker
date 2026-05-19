import { describe, expect, it, vi } from "vitest";
import { originGuard } from "./originGuard.js";

function mockReply() {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as unknown as Parameters<typeof originGuard>[1] & typeof reply;
}

const WEB = process.env.WEB_ORIGIN ?? "http://localhost:4321";

describe("originGuard", () => {
  it("lets safe methods through unconditionally", async () => {
    const reply = mockReply();
    await originGuard(
      { method: "GET", url: "/audits/abc", headers: {} } as never,
      reply,
    );
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("allows POSTs with a matching Origin header", async () => {
    const reply = mockReply();
    await originGuard(
      { method: "POST", url: "/audits", headers: { origin: WEB } } as never,
      reply,
    );
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("blocks POSTs with a foreign Origin", async () => {
    const reply = mockReply();
    await originGuard(
      { method: "POST", url: "/audits", headers: { origin: "https://evil.example" } } as never,
      reply,
    );
    expect(reply.code).toHaveBeenCalledWith(403);
  });

  it("allows OAuth callbacks regardless of origin", async () => {
    const reply = mockReply();
    await originGuard(
      {
        method: "POST",
        url: "/auth/google/callback",
        headers: { origin: "https://accounts.google.com" },
      } as never,
      reply,
    );
    expect(reply.code).not.toHaveBeenCalled();
  });

  it("allows requests with no Origin/Referer (curl, server-to-server)", async () => {
    const reply = mockReply();
    await originGuard(
      { method: "POST", url: "/audits", headers: {} } as never,
      reply,
    );
    expect(reply.code).not.toHaveBeenCalled();
  });
});

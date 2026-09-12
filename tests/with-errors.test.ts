import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { BadRequestError, UnauthorizedError, readJsonBody, withErrors } from "../lib/api/withErrors";

function request(body?: string): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("withErrors", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("passes a successful response through untouched", async () => {
    const handler = withErrors(async () => NextResponse.json({ ok: true }, { status: 201 }));
    const res = await handler(request());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("maps BadRequestError to 400 with its message", async () => {
    const handler = withErrors(async () => {
      throw new BadRequestError("invalid payload");
    });
    const res = await handler(request());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid payload" });
  });

  it("maps UnauthorizedError to 401 with its message", async () => {
    const handler = withErrors(async () => {
      throw new UnauthorizedError("unauthorized");
    });
    const res = await handler(request());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("honours a numeric status on arbitrary errors within the 4xx-5xx range", async () => {
    const handler = withErrors(async () => {
      throw Object.assign(new Error("slow down"), { status: 429 });
    });
    const res = await handler(request());
    expect(res.status).toBe(429);
  });

  it("falls back to 500 when the error status is outside the HTTP error range", async () => {
    const handler = withErrors(async () => {
      throw Object.assign(new Error("weird"), { status: 999 });
    });
    const res = await handler(request());
    expect(res.status).toBe(500);
  });

  it("exposes the error message for 5xx outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const handler = withErrors(async () => {
      throw new Error("ConnectionFailed(db)");
    });
    const res = await handler(request());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "ConnectionFailed(db)" });
  });

  it("masks 5xx messages in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const handler = withErrors(async () => {
      throw new Error("ConnectionFailed(db)");
    });
    const res = await handler(request());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal server error" });
  });

  it("still returns 4xx messages in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const handler = withErrors(async () => {
      throw new BadRequestError("invalid triggerAt");
    });
    const res = await handler(request());
    expect(await res.json()).toEqual({ error: "invalid triggerAt" });
  });
});

describe("readJsonBody", () => {
  it("returns the parsed body", async () => {
    await expect(readJsonBody(request(JSON.stringify({ a: 1 })))).resolves.toEqual({ a: 1 });
  });

  it("throws BadRequestError on malformed JSON", async () => {
    await expect(readJsonBody(request("{not json"))).rejects.toBeInstanceOf(BadRequestError);
  });

  it("throws BadRequestError on an empty body", async () => {
    await expect(readJsonBody(request())).rejects.toBeInstanceOf(BadRequestError);
  });
});

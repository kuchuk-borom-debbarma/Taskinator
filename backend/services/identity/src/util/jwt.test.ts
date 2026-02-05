import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { contextStorage } from "hono/context-storage";
import { createJwtToken, verifyJwtToken } from "./jwt";
import { Bindings } from "./env";

describe("JWT Utility", () => {
  const env: Bindings = {
    JWT_SECRET: "test-secret-key-that-is-long-enough",
    JWE_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    DATABASE_URL: "postgres://test"
  };

  const app = new Hono<{ Bindings: Bindings }>();
  app.use("*", contextStorage());

  app.get("/create", async (c) => {
    const token = await createJwtToken({
      subject: c.req.query("sub") || "user-123",
      expiresAt: Math.floor(Date.now() / 1000) + (c.req.query("expired") ? -3600 : 3600)
    });
    return c.text(token);
  });

  app.get("/verify", async (c) => {
    const payload = await verifyJwtToken({ token: c.req.query("token")! });
    return c.json(payload);
  });

  it("should create and verify a valid token", async () => {
    const createRes = await app.request("/create?sub=user-123", {}, env);
    const token = await createRes.text();
    expect(token).toBeDefined();

    const verifyRes = await app.request(`/verify?token=${token}`, {}, env);
    const payload = await verifyRes.json();
    expect(payload.sub).toBe("user-123");
  });

  it("should return null for an invalid token", async () => {
    const verifyRes = await app.request(`/verify?token=invalid.token`, {}, env);
    const payload = await verifyRes.json();
    expect(payload).toBeNull();
  });

  it("should return null for an expired token", async () => {
    const createRes = await app.request("/create?expired=true", {}, env);
    const token = await createRes.text();

    const verifyRes = await app.request(`/verify?token=${token}`, {}, env);
    const payload = await verifyRes.json();
    expect(payload).toBeNull();
  });
});
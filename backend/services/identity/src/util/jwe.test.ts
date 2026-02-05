import { describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { contextStorage } from "hono/context-storage";
import { createJwe, decryptJwe } from "./jwe";
import { Bindings } from "./env";

describe("JWE Utility", () => {
  const env: Bindings = {
    JWT_SECRET: "test-secret",
    JWE_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    DATABASE_URL: "postgres://test"
  };

  const app = new Hono<{ Bindings: Bindings }>();
  app.use("*", contextStorage());

  app.get("/encrypt", async (c) => {
    const payload = c.req.query("payload")!;
    const encrypted = await createJwe(payload);
    return c.text(encrypted);
  });

  app.get("/decrypt", async (c) => {
    try {
      const token = c.req.query("token")!;
      const decrypted = await decryptJwe(token);
      return c.text(decrypted);
    } catch (e) {
      return c.text("error", 500);
    }
  });

  it("should encrypt and decrypt a payload correctly", async () => {
    const originalPayload = "hello-world";
    const encRes = await app.request(`/encrypt?payload=${originalPayload}`, {}, env);
    const token = await encRes.text();
    
    expect(token).toBeDefined();

    const decRes = await app.request(`/decrypt?token=${token}`, {}, env);
    const decrypted = await decRes.text();
    expect(decrypted).toBe(originalPayload);
  });

  it("should throw error for invalid JWE", async () => {
    const res = await app.request("/decrypt?token=invalid.token", {}, env);
    expect(res.status).toBe(500);
  });
});
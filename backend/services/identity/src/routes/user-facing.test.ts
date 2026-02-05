import { describe, expect, it, mock, beforeEach } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { contextStorage } from "hono/context-storage";
import publicRoute from "./user-facing";
import { authService, notiService } from "../services";
import { Bindings, Variables } from "../util/env";
import { createJwtToken } from "../util/jwt";
import { createJwe } from "../util/jwe";

// Mock the services
mock.module("../services", () => ({
  authService: {
    createUserJWEToken: mock(),
    verifyUserFromJWEToken: mock(),
    createUser: mock(),
    getUserByCredential: mock(),
    getUserByFilter: mock(),
    updateUserById: mock(),
  },
  notiService: {
    sendNotification: mock(),
  },
}));

describe("User-Facing Routes", () => {
  const env: Bindings = {
    JWT_SECRET: "test-secret",
    JWE_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    DATABASE_URL: "postgres://test"
  };

  const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();
  app.use("*", contextStorage());
  
  app.get("/issue-token", async (c) => {
    const token = await createJwtToken({
      subject: "user-123",
      expiresAt: Math.floor(Date.now() / 1000) + 3600
    });
    return c.text(token);
  });

  app.get("/issue-jwe", async (c) => {
    const payload = c.req.query("p")!;
    const token = await createJwe(payload);
    return c.text(token);
  });

  app.route("/api/v1/public", publicRoute);

  beforeEach(() => {
    for (const m of Object.values(authService)) {
      if (typeof m === 'function' && (m as any).mock) (m as any).mockClear();
    }
    (notiService.sendNotification as any).mockClear();
  });

  describe("POST /sign-up", () => {
    it("should return 200 for valid data", async () => {
      (authService.createUserJWEToken as any).mockResolvedValue("fake-jwe-token");
      const res = await app.request("/api/v1/public/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          username: "testuser",
          displayName: "Test User"
        })
      }, env);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /complete-sign-up", () => {
    it("should return 200 for valid token", async () => {
      (authService.verifyUserFromJWEToken as any).mockResolvedValue({});
      const res = await app.request("/api/v1/public/complete-sign-up?token=v", {}, env);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /me/info (authenticated info)", () => {
    it("should return 200 for valid token", async () => {
      const tokenRes = await app.request("/issue-token", {}, env);
      const token = await tokenRes.text();
      const res = await app.request("/api/v1/public/me/info", {
        headers: { "Authorization": `Bearer ${token}` }
      }, env);
      expect(res.status).toBe(200);
    });
  });

  describe("Password Management", () => {
    it("POST /reset-password should return 200", async () => {
      (authService.getUserByFilter as any).mockResolvedValue({ id: "u1", email: "t@e.com" });
      const res = await app.request("/api/v1/public/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "t@e.com", password: "123456" }) // Must be 6 chars
      }, env);
      expect(res.status).toBe(200);
    });

    it("GET /complete-reset-password should work", async () => {
      const payload = JSON.stringify({ userId: "u1", password: "p1" });
      const tokenRes = await app.request(`/issue-jwe?p=${encodeURIComponent(payload)}`, {}, env);
      const token = await tokenRes.text();

      const res = await app.request(`/api/v1/public/complete-reset-password?token=${token}`, {}, env);
      expect(res.status).toBe(200);
      expect(authService.updateUserById).toHaveBeenCalled();
    });

    it("POST /update-password should work", async () => {
      (authService.getUserByCredential as any).mockResolvedValue({ id: "u1" });
      const res = await app.request("/api/v1/public/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "t@e.com",
          currentPassword: "old",
          newPassword: "666666" // Must be 6 chars
        })
      }, env);
      expect(res.status).toBe(200);
    });
  });
});
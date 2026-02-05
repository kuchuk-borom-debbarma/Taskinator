import { describe, expect, it, mock, beforeEach } from "bun:test";
import { AuthServiceImpl } from "./internal/AuthServiceImpl";
import { Hono } from "hono";
import { contextStorage } from "hono/context-storage";
import { Bindings } from "../../util/env";

// Mock the queries
mock.module("./internal/Queries", () => ({
  findUserByFilter: mock(),
  createUserQuery: mock(),
  updateUserQuery: mock(),
}));

import { findUserByFilter, createUserQuery, updateUserQuery } from "./internal/Queries";

describe("AuthServiceImpl", () => {
  const service = new AuthServiceImpl();
  const env: Bindings = {
    JWT_SECRET: "test-secret",
    JWE_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    DATABASE_URL: "postgres://test"
  };

  const app = new Hono<{ Bindings: Bindings }>();
  app.use("*", contextStorage());

  beforeEach(() => {
    (findUserByFilter as any).mockClear();
    (createUserQuery as any).mockClear();
    (updateUserQuery as any).mockClear();
  });

  describe("getUserByFilter", () => {
    it("should return user if found", async () => {
      const mockUser = {
        id: "1",
        username: "test",
        email: "test@example.com",
        displayName: "Test",
        createdAt: new Date(),
        updatedAt: null,
      };
      (findUserByFilter as any).mockResolvedValue([mockUser]);

      const user = await service.getUserByFilter({ username: "test" });
      expect(user).not.toBeNull();
      expect(user?.username).toBe("test");
    });

    it("should return null if not found", async () => {
      (findUserByFilter as any).mockResolvedValue([]);
      const user = await service.getUserByFilter({ username: "none" });
      expect(user).toBeNull();
    });
  });

  describe("getUserByCredential", () => {
    it("should return user for correct password", async () => {
      const password = "correct-password";
      const hashed = await (new AuthServiceImpl() as any).createUser({ password }); // We just need a hash
      const mockUser = {
        id: "1",
        password: (createUserQuery as any).mock.calls[0][0].password,
        username: "test",
        email: "test@example.com",
      };
      (findUserByFilter as any).mockResolvedValue([mockUser]);

      const user = await service.getUserByCredential({
        key: "test",
        method: "user",
        password: password
      });

      expect(user).not.toBeNull();
      expect(user?.id).toBe("1");
    });

    it("should return null for incorrect password", async () => {
      // Use a valid hash from another password so timingSafeEqual doesn't fail on length
      const otherHash = await (new AuthServiceImpl() as any).createUser({ password: "other" });
      const hashed = (createUserQuery as any).mock.calls[0][0].password;
      
      (findUserByFilter as any).mockResolvedValue([{ id: "1", password: hashed }]);

      const user = await service.getUserByCredential({
        key: "test",
        method: "user",
        password: "wrong-password"
      });

      expect(user).toBeNull();
    });
  });

  describe("JWE Tokens", () => {
    it("should create and verify JWE token", async () => {
      const signUpData = {
        email: "test@example.com",
        password: "password123",
        username: "testuser",
        displayName: "Test User"
      };

      // Needs context for createJwe/decryptJwe
      let token = "";
      let verifiedData: any;

      app.get("/test", async (c) => {
        token = await service.createUserJWEToken(signUpData);
        verifiedData = await service.verifyUserFromJWEToken(token);
        return c.text("ok");
      });

      await app.request("/test", {}, env);

      expect(token).toBeDefined();
      expect(verifiedData).toEqual(signUpData);
    });
  });

  describe("createUser", () => {
    it("should hash password and call query", async () => {
      (createUserQuery as any).mockResolvedValue([]);
      
      const signUpData = {
        email: "test@example.com",
        password: "plain-password",
        username: "testuser",
        displayName: "Test User"
      };

      await service.createUser(signUpData);

      expect(createUserQuery).toHaveBeenCalled();
      const calledWith = (createUserQuery as any).mock.calls[0][0];
      expect(calledWith.password).not.toBe("plain-password");
      expect(calledWith.password).toContain(":"); // Format of our hash
    });
  });
});

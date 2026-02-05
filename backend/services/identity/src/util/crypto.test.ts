import { describe, expect, it } from "bun:test";
import { hashPassword, verifyPassword } from "./crypto";

describe("Crypto Utility", () => {
  it("should hash and verify a password correctly", async () => {
    const password = "mySecurePassword123";
    const hashed = await hashPassword(password);
    
    expect(hashed).toContain(":");
    expect(await verifyPassword(password, hashed)).toBe(true);
  });

  it("should fail for an incorrect password", async () => {
    const password = "correctPassword";
    const wrongPassword = "wrongPassword";
    const hashed = await hashPassword(password);
    
    expect(await verifyPassword(wrongPassword, hashed)).toBe(false);
  });

  it("should fail for an invalid stored hash format", async () => {
    const password = "password";
    const invalidHash = "not-a-proper-hash";
    
    expect(await verifyPassword(password, invalidHash)).toBe(false);
  });

  it("should generate different hashes for the same password due to salt", async () => {
    const password = "password";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});

import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Promisify scrypt to use it with async/await
const scryptAsync = promisify(scrypt);

/**
 * Hashes a password using scrypt with a unique salt.
 * @returns A string in the format "salt:hash"
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16).toString("hex");

  // N: 16384 (cost factor), r: 8 (block size), p: 1 (parallelization)
  // keylen: 64 (length of the derived key)
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
};

/**
 * Verifies a password against a stored "salt:hash" string.
 */
export const verifyPassword = async (
  password: string,
  storedHash: string,
): Promise<boolean> => {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;

  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;

  // timingSafeEqual prevents timing attacks by ensuring
  // the comparison always takes the same amount of time.
  return timingSafeEqual(keyBuffer, derivedKey);
};

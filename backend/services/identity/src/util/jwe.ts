import { getContext } from "hono/context-storage";
import { CompactEncrypt, compactDecrypt } from "jose";
import { Bindings } from "./env";

const encoder = new TextEncoder();

export const createJwe = async (payload: string): Promise<string> => {
  const c = getContext<{ Bindings: Bindings }>();
  // Convert the string secret into a Uint8Array key
  const key = hexToUint8Array(c.env.JWE_KEY);

  return await new CompactEncrypt(encoder.encode(payload))
    .setProtectedHeader({
      alg: "dir",
      enc: "A256GCM",
    })
    .encrypt(key);
};

export const decryptJwe = async (jwe: string): Promise<any> => {
  const c = getContext<{ Bindings: Bindings }>();
  const key = hexToUint8Array(c.env.JWE_KEY);

  const { plaintext } = await compactDecrypt(jwe, key);

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
};

// Helper to convert Hex string to Uint8Array
const hexToUint8Array = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
};

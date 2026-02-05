import { getContext } from "hono/context-storage";
import { sign, verify } from "hono/jwt";
import { Bindings } from "./env";
import { JWTPayload } from "hono/utils/jwt/types";

export const createJwtToken = async (data: {
  subject: string;
  claims?: Record<string, unknown>;
  expiresAt: number; // epoch seconds
}): Promise<string> => {
  const payload = {
    sub: data.subject,
    exp: data.expiresAt,
    ...data.claims,
  };
  const c = getContext<{ Bindings: Bindings }>();
  const secret = c.env.JWT_SECRET;
  return await sign(payload, secret, "HS256");
};

export const verifyJwtToken = async (data: {}): Promise<JWTPayload | null> => {
  const token = (data as any).token as string;
  const c = getContext<{ Bindings: Bindings }>();
  const secret = c.env.JWT_SECRET;
  try {
    return await verify(token, secret, "HS256");
  } catch (e) {
    return null;
  }
};

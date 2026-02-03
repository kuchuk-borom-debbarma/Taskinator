import { getContext } from "hono/context-storage";
import { decode, sign, verify } from "hono/jwt";
import { Bindings } from "./env";

export const createJwtToken = async (data: {
  subject: string;
  claims?: Record<string, unknown>;
  expiresAt: number; // epoch millis
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

export const verifyJwtToken = async (data: {}): Promise<boolean> => {
  const token = (data as any).token as string;
  const c = getContext<{ Bindings: Bindings }>();
  const secret = c.env.JWT_SECRET;
  try {
    await verify(token, secret, "HS256");
    return true;
  } catch (e) {
    return false;
  }
};

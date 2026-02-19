import { Context } from "hono";

export const getVerificationLink = (c: Context, pathSuffix: string, token: string) => {
  const url = new URL(c.req.url);
  return `${url.origin}/api/v1/public/${pathSuffix}?token=${token}`;
};

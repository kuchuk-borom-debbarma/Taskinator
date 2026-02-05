import { Context } from "hono";

export const getVerificationLink = (c: Context, pathSuffix: string, token: string) => {
  const url = new URL(c.req.url);
  const currentPath = c.req.path;
  const basePath = currentPath.substring(0, currentPath.lastIndexOf("/"));
  return `${url.origin}${basePath}/${pathSuffix}?token=${token}`;
};

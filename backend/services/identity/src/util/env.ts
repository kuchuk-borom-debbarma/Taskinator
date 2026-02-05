import { JWTPayload } from "hono/utils/jwt/types";

export type Bindings = {
  JWT_SECRET: string;
  JWE_KEY: string;
  DATABASE_URL: string;
};

export type Variables = {
  identity: JWTPayload;
};
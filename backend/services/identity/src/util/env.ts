import { JWTPayload } from "hono/utils/jwt/types";
import type { Database } from "../db";

export type Bindings = {
  JWT_SECRET: string;
  JWE_KEY: string;
  DATABASE_URL: string;
};

export type Variables = {
  identity: JWTPayload;
  db: Database;
};
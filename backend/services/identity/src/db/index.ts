import { drizzle } from "drizzle-orm/neon-http";
import { getContext } from "hono/context-storage";
import { Bindings } from "../util/env";
import { neon } from "@neondatabase/serverless";
import * as usersSchema from "./schemas/users";

export const getDb = () => {
  const c = getContext<{ Bindings: Bindings }>();
  const client = neon(c.env.DATABASE_URL);
  return drizzle(client, { schema: { ...usersSchema } });
};

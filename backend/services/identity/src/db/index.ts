import { drizzle } from "drizzle-orm/postgres-js";
import { getContext } from "hono/context-storage";
import { Bindings } from "../util/env";
import postgres from "postgres";
import * as usersSchema from "./schemas/users";

let sql: ReturnType<typeof postgres> | undefined;

export const getDb = () => {
  const c = getContext<{ Bindings: Bindings }>();
  if (!c.env?.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in the environment bindings.");
  }
  
  if (!sql) {
    sql = postgres(c.env.DATABASE_URL);
  }
  
  return drizzle(sql, { schema: { ...usersSchema } });
};

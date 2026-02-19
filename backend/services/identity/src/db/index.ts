import { drizzle } from "drizzle-orm/postgres-js";
import { getContext } from "hono/context-storage";
import { Bindings } from "../util/env";
import postgres from "postgres";
import * as usersSchema from "./schemas/users";

let sql: ReturnType<typeof postgres> | undefined;
let currentUrl: string | undefined;

export const getDb = () => {
  const c = getContext<{ Bindings: Bindings }>();
  const url = c.env?.DATABASE_URL;
  
  if (!url) {
    throw new Error("DATABASE_URL is not defined in the environment bindings.");
  }
  
  if (!sql || currentUrl !== url) {
    if (sql) {
      console.log("Recreating database connection due to URL change or restart");
    }
    currentUrl = url;
    sql = postgres(url, { 
      onnotice: () => {},
      prepare: false,
    });
  }
  
  return drizzle(sql, { schema: { ...usersSchema } });
};

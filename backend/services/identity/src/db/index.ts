import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { getContext } from "hono/context-storage";
import { Bindings, Variables } from "../util/env";
import postgres from "postgres";
import * as usersSchema from "./schemas/users";

export type Database = PostgresJsDatabase<typeof usersSchema>;

export const getDb = (): Database => {
  const c = getContext<{ Bindings: Bindings; Variables: Variables }>();
  const url = c.env?.DATABASE_URL;
  
  if (!url) {
    throw new Error("DATABASE_URL is not defined in the environment bindings.");
  }
  
  // Check if we already have a DB instance for THIS request
  let db = c.get("db") as Database;
  
  if (!db) {
    // Initialize for this request context only
    const client = postgres(url, { 
      prepare: false, 
      max: 1, 
      connect_timeout: 10,
      onnotice: () => {},
    });

    db = drizzle(client, { schema: { ...usersSchema } });
    
    // Cache it in the context for subsequent calls in the same request
    c.set("db", db);
  }
  
  return db;
};

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { getDatabaseUrl, isSupabaseConnection } from "./connection";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ...(isSupabaseConnection() ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function buildConnectionString(): string {
  // Prefer Supabase when all three vars are set
  const host = process.env.SUPABASE_PG_HOST;
  const user = process.env.SUPABASE_PG_USER;
  const password = process.env.SUPABASE_DB_PASSWORD;
  const dbName = process.env.SUPABASE_PG_DB ?? "postgres";
  const port = process.env.SUPABASE_PG_PORT ?? "6543";

  if (host && user && password) {
    return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
  }

  // Fall back to Replit-provisioned PostgreSQL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  throw new Error(
    "No database connection configured. Set SUPABASE_PG_HOST + SUPABASE_PG_USER + SUPABASE_DB_PASSWORD, or DATABASE_URL."
  );
}

const connectionString = buildConnectionString();
const useSSL = !!process.env.SUPABASE_PG_HOST;

export const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";

import { defineConfig } from "drizzle-kit";
import path from "path";
import { getDatabaseUrl, isSupabaseConnection } from "./src/connection";

const url = getDatabaseUrl();

function supabaseCredentials() {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1) || "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: isSupabaseConnection() ? supabaseCredentials() : { url },
});

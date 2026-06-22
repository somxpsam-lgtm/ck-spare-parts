const DEFAULT_SUPABASE_DB_HOST = "aws-1-ap-south-1.pooler.supabase.com";
const DEFAULT_SUPABASE_DB_PORT = "5432";

/**
 * Builds the Supabase Postgres (Supavisor session pooler) connection string
 * from the existing SUPABASE_URL + SUPABASE_DB_PASSWORD secrets.
 * Returns null when Supabase is not configured.
 */
function buildSupabaseUrl(): string | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!supabaseUrl || !password) return null;

  let projectRef: string;
  try {
    projectRef = new URL(supabaseUrl).host.split(".")[0];
  } catch {
    return null;
  }
  if (!projectRef) return null;

  const host = process.env.SUPABASE_DB_HOST || DEFAULT_SUPABASE_DB_HOST;
  const port = process.env.SUPABASE_DB_PORT || DEFAULT_SUPABASE_DB_PORT;
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
}

/** True when the active connection targets Supabase (requires SSL). */
export function isSupabaseConnection(): boolean {
  return buildSupabaseUrl() !== null;
}

/**
 * Resolves the database connection string. Prefers Supabase (the app's primary
 * datastore). In development it falls back to Replit's managed DATABASE_URL when
 * Supabase is not configured; in production it fails closed instead.
 */
export function getDatabaseUrl(): string {
  const supabase = buildSupabaseUrl();
  if (supabase) return supabase;

  // Fail closed in production: never silently fall back to Replit's DATABASE_URL.
  // Supabase is the canonical datastore, so a deployed app with missing Supabase
  // secrets must surface the misconfiguration instead of writing to a stale DB.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Supabase is not configured in production. Set SUPABASE_URL + SUPABASE_DB_PASSWORD.",
    );
  }

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error(
    "No database connection configured. Set SUPABASE_URL + SUPABASE_DB_PASSWORD (preferred) or DATABASE_URL.",
  );
}

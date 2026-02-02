import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __yadoLunchPgPool: Pool | undefined;
}

function getConnectionString(): string {
  const url =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    "";
  if (!url) throw new Error("DB_NOT_CONFIGURED");
  return url;
}

export function getDbPool(): Pool {
  if (globalThis.__yadoLunchPgPool) return globalThis.__yadoLunchPgPool;

  const connectionString = getConnectionString();
  let ssl: false | { rejectUnauthorized: boolean } = false;
  try {
    const u = new URL(connectionString);
    const host = u.hostname.toLowerCase();
    const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
    const pgsslmode = (process.env.PGSSLMODE || "").toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1";
    const wantsSsl = sslmode === "require" || pgsslmode === "require" || host.endsWith(".supabase.co") || host.endsWith(".supabase.net");
    if (!isLocal && (wantsSsl || process.env.NODE_ENV === "production")) {
      ssl = { rejectUnauthorized: false };
    }
  } catch {
    // ignore (fallback: ssl=false)
  }
  const pool = new Pool({
    connectionString,
    ssl,
    // サーバーレス/少人数運用想定で抑えめ
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  globalThis.__yadoLunchPgPool = pool;
  return pool;
}

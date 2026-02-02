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
  const pool = new Pool({
    connectionString,
    // サーバーレス/少人数運用想定で抑えめ
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  globalThis.__yadoLunchPgPool = pool;
  return pool;
}

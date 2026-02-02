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
  // Supabase/NeonなどのManaged PostgresはSSL必須が多い。
  // `SELF_SIGNED_CERT_IN_CHAIN` が出るケースがあるため、基本はSSL接続しつつ証明書検証は緩める。
  // 無効化したい場合は `PGSSLMODE=disable` または `?sslmode=disable` を使う。
  let ssl: false | { rejectUnauthorized: boolean } = { rejectUnauthorized: false };
  const pgsslmode = (process.env.PGSSLMODE || "").toLowerCase();
  if (pgsslmode === "disable") ssl = false;
  try {
    const u = new URL(connectionString);
    const host = u.hostname.toLowerCase();
    const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
    const isLocal = host === "localhost" || host === "127.0.0.1";
    if (isLocal) ssl = false;
    if (sslmode === "disable") ssl = false;
    if (sslmode === "require") ssl = { rejectUnauthorized: false };
  } catch {
    // URL parse failure: keep defaults above
  }

  // Vercel上で `SELF_SIGNED_CERT_IN_CHAIN` が出る場合の最終回避策。
  // rejectUnauthorized=false にしてもTLS層で弾かれる環境があるため、Node全体の検証もOFFにする。
  // （社内ツール想定。厳密にするならCAを用意して検証ONへ移行してください）
  if (ssl && typeof ssl === "object" && ssl.rejectUnauthorized === false) {
    if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
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

import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

type AppState = {
  version: number;
  members: unknown[];
  exclusions: unknown[];
  runs: unknown[];
};

function isStateLike(v: unknown): v is AppState {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<AppState>;
  return (
    typeof s.version === "number" &&
    Array.isArray(s.members) &&
    Array.isArray(s.exclusions) &&
    Array.isArray(s.runs)
  );
}

async function requireUser(req: NextRequest): Promise<{ email: string }> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = typeof token?.email === "string" ? token.email : "";
  if (!email) throw new Error("UNAUTHORIZED");
  return { email };
}

async function ensureTable() {
  const pool = getDbPool();
  await pool.query(`
    create table if not exists app_state (
      id int primary key,
      state jsonb not null,
      updated_at timestamptz not null default now(),
      updated_by text
    );
  `);
}

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    await ensureTable();

    const pool = getDbPool();
    const rows = await pool.query<{ state: unknown; updated_at: Date | null }>(
      "select state, updated_at from app_state where id = 1 limit 1"
    );

    if (rows.rowCount === 0) {
      return NextResponse.json({ ok: true, state: null, updatedAt: null });
    }

    const row = rows.rows[0]!;
    const state = typeof row.state === "string" ? JSON.parse(row.state) : (row.state ?? null);
    const updatedAt = row.updated_at ? row.updated_at.toISOString() : null;
    return NextResponse.json({ ok: true, state, updatedAt });
  } catch (err) {
    const msg = String((err as Error)?.message || err);
    const pgCode = typeof (err as { code?: unknown })?.code === "string" ? (err as { code?: string }).code : null;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (msg === "DB_NOT_CONFIGURED") return NextResponse.json({ ok: false, error: "db_not_configured" }, { status: 503 });
    if (pgCode) return NextResponse.json({ ok: false, error: "db_error", details: { code: pgCode, message: msg } }, { status: 502 });
    return NextResponse.json({ ok: false, error: "internal_error", details: { message: msg } }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { email } = await requireUser(req);
    await ensureTable();

    const body = (await req.json().catch(() => ({}))) as { state?: unknown; expectedUpdatedAt?: unknown };
    const state = body?.state;
    const expectedUpdatedAt = typeof body?.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : null;
    if (!isStateLike(state)) return NextResponse.json({ ok: false, error: "invalid_state" }, { status: 400 });

    const pool = getDbPool();
    const existing = await pool.query<{ updated_at: Date | null }>("select updated_at from app_state where id = 1 limit 1");
    const currentUpdatedAt = existing.rowCount ? existing.rows[0]!.updated_at : null;
    const currentUpdatedAtIso = currentUpdatedAt ? currentUpdatedAt.toISOString() : null;

    if (expectedUpdatedAt && currentUpdatedAtIso && expectedUpdatedAt !== currentUpdatedAtIso) {
      return NextResponse.json({ ok: false, error: "conflict", updatedAt: currentUpdatedAtIso }, { status: 409 });
    }

    const stateJson = JSON.stringify(state);
    const result = await pool.query<{ updated_at: Date }>(
      `
        insert into app_state (id, state, updated_by)
        values (1, $1::jsonb, $2)
        on conflict (id) do update
        set state = excluded.state,
            updated_at = now(),
            updated_by = excluded.updated_by
        returning updated_at
      `,
      [stateJson, email]
    );

    const updatedAt = result.rows[0]?.updated_at ? result.rows[0].updated_at.toISOString() : null;
    return NextResponse.json({ ok: true, updatedAt });
  } catch (err) {
    const msg = String((err as Error)?.message || err);
    const pgCode = typeof (err as { code?: unknown })?.code === "string" ? (err as { code?: string }).code : null;
    if (msg === "UNAUTHORIZED") return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (msg === "DB_NOT_CONFIGURED") return NextResponse.json({ ok: false, error: "db_not_configured" }, { status: 503 });
    if (pgCode) return NextResponse.json({ ok: false, error: "db_error", details: { code: pgCode, message: msg } }, { status: 502 });
    return NextResponse.json({ ok: false, error: "internal_error", details: { message: msg } }, { status: 500 });
  }
}

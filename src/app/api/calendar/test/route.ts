import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildTokyoEventTimes, isValidEmail, nextMondayYmdInTokyo, requireGoogleAccessToken } from "../_shared";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, userEmail } = await requireGoogleAccessToken(req);
    const body = (await req.json().catch(() => ({}))) as { otherEmail?: unknown };
    const otherEmail = body?.otherEmail;
    if (!isValidEmail(otherEmail)) return NextResponse.json({ error: "otherEmail が不正です" }, { status: 400 });

    const ymd = nextMondayYmdInTokyo();
    const times = buildTokyoEventTimes(ymd);

    const event = {
      summary: "ランチ会（自動作成テスト）",
      ...times,
      attendees: [{ email: userEmail }, { email: String(otherEmail).trim() }],
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return NextResponse.json({ error: "Google Calendar API error", googleStatus: res.status, details: data }, { status: 502 });

    return NextResponse.json({ ok: true, id: data.id ?? null, htmlLink: data.htmlLink ?? null, date: ymd });
  } catch (err) {
    if (String((err as Error)?.message || err) === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

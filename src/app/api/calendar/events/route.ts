import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidEmail, requireGoogleAccessToken } from "../_shared";

type EventInput = {
  summary: unknown;
  description?: unknown;
  start: { dateTime: unknown; timeZone?: unknown };
  end: { dateTime: unknown; timeZone?: unknown };
  attendees: { email: unknown }[];
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await requireGoogleAccessToken(req);
    const body = (await req.json().catch(() => ({}))) as { events?: unknown };
    const rawEvents = Array.isArray(body?.events) ? body.events : [];
    if (rawEvents.length === 0) return NextResponse.json({ error: "events が空です" }, { status: 400 });
    if (rawEvents.length > 60) return NextResponse.json({ error: "events が多すぎます（最大60件）" }, { status: 400 });

    const results: { ok: boolean; id?: string; htmlLink?: string; error?: unknown }[] = [];

    for (const raw of rawEvents) {
      const e = raw as EventInput;
      const summary = asString(e?.summary).trim();
      const description = asString(e?.description);
      const startDateTime = asString(e?.start?.dateTime).trim();
      const endDateTime = asString(e?.end?.dateTime).trim();
      const timeZone = asString(e?.start?.timeZone || e?.end?.timeZone || "Asia/Tokyo") || "Asia/Tokyo";
      const attendees = Array.isArray(e?.attendees) ? e.attendees : [];
      const attendeeEmails = attendees.map((a) => (typeof a?.email === "string" ? a.email.trim() : "")).filter(Boolean);

      if (!summary || !startDateTime || !endDateTime) {
        results.push({ ok: false, error: "summary/start/end が不正です" });
        continue;
      }
      if (attendeeEmails.length === 0 || attendeeEmails.some((em) => !isValidEmail(em))) {
        results.push({ ok: false, error: "attendees が不正です" });
        continue;
      }

      const payload = {
        summary,
        description: description || undefined,
        start: { dateTime: startDateTime, timeZone },
        end: { dateTime: endDateTime, timeZone },
        attendees: attendeeEmails.map((email) => ({ email })),
      };

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        results.push({ ok: false, error: { googleStatus: res.status, details: data } });
        continue;
      }
      results.push({ ok: true, id: data.id ?? undefined, htmlLink: data.htmlLink ?? undefined });
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    if (String((err as Error)?.message || err) === "UNAUTHORIZED") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function requireGoogleAccessToken(req: NextRequest): Promise<{ accessToken: string; userEmail: string }> {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const accessToken = typeof token?.accessToken === "string" ? token.accessToken : "";
  const userEmail = typeof token?.email === "string" ? token.email : "";
  if (!accessToken || !userEmail) throw new Error("UNAUTHORIZED");
  return { accessToken, userEmail };
}

export function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  const v = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function buildTokyoEventTimes(ymd: string): { start: { dateTime: string; timeZone: string }; end: { dateTime: string; timeZone: string } } {
  // RFC3339 (Asia/Tokyo = +09:00)
  return {
    start: { dateTime: `${ymd}T12:00:00+09:00`, timeZone: "Asia/Tokyo" },
    end: { dateTime: `${ymd}T13:00:00+09:00`, timeZone: "Asia/Tokyo" },
  };
}

export function nextMondayYmdInTokyo(now = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const base = new Date(`${ymd}T00:00:00Z`);
  const dow = base.getUTCDay(); // 0:Sun..6:Sat
  const delta = (1 - dow + 7) % 7; // Monday=1
  const target = new Date(base);
  target.setUTCDate(target.getUTCDate() + delta);
  return target.toISOString().slice(0, 10);
}

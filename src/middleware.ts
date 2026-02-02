import { withAuth } from "next-auth/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const authMiddleware = withAuth({
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export default function middleware(req: NextRequest) {
  // たまに別ドメイン（Deployment URL等）でアクセスされると、OAuthのredirect_uriが揺れて mismatch になり得るため、
  // NEXTAUTH_URL のホストへ寄せる（canonical化）。
  const canonical = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).host : "";
  if (canonical && req.nextUrl.host && req.nextUrl.host !== canonical) {
    const url = req.nextUrl.clone();
    url.host = canonical;
    if (process.env.NEXTAUTH_URL?.startsWith("https://")) url.protocol = "https:";
    return NextResponse.redirect(url);
  }

  // /login, /logout は未ログインでも表示OK（ここでwithAuthを通すとループの原因になる）
  if (req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/logout")) {
    return NextResponse.next();
  }

  return authMiddleware(req);
}

export const config = {
  matcher: ["/", "/spa/:path*", "/login", "/logout"],
};

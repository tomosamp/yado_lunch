import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

function isAllowedEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  return email.toLowerCase().endsWith("@yadokari.tv");
}

type Token = {
  accessToken?: string;
  accessTokenExpires?: number;
  refreshToken?: string;
  [k: string]: unknown;
};

async function refreshGoogleAccessToken(token: Token): Promise<Token> {
  try {
    const refreshToken = token.refreshToken;
    if (!refreshToken) return token;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: String(refreshToken),
      }),
    });

    const data = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !data.access_token) {
      return { ...token, error: data.error ?? "RefreshAccessTokenError" };
    }

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + (data.expires_in ?? 3600) * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          // "hd" は強制ではない（誘導用）。最終判定は callbacks.signIn で email を検証する。
          hd: "yadokari.tv",
          prompt: "consent select_account",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            // Calendar 予定作成（招待）用
            "https://www.googleapis.com/auth/calendar.events",
          ].join(" "),
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login", signOut: "/logout" },
  callbacks: {
    async signIn({ profile }) {
      const email = (profile as { email?: unknown })?.email;
      const emailVerified = (profile as { email_verified?: unknown })?.email_verified;
      if (!(emailVerified === true || emailVerified === "true")) return false;
      return isAllowedEmail(email);
    },
    async jwt({ token, account }) {
      const t = token as Token;
      if (account) {
        if (typeof account.access_token === "string") t.accessToken = account.access_token;
        if (typeof account.refresh_token === "string") t.refreshToken = account.refresh_token;
        if (typeof account.expires_at === "number") t.accessTokenExpires = account.expires_at * 1000;
      }

      if (t.accessToken && t.accessTokenExpires && Date.now() < t.accessTokenExpires - 60_000) return token;
      if (!t.refreshToken) return token;
      return refreshGoogleAccessToken(t);
    },
  },
};

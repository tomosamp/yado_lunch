import GoogleProvider from "next-auth/providers/google";
import type { NextAuthOptions } from "next-auth";

function isAllowedEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  return email.toLowerCase().endsWith("@yadokari.tv");
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
          prompt: "select_account",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ profile }) {
      const email = (profile as { email?: unknown })?.email;
      const emailVerified = (profile as { email_verified?: unknown })?.email_verified;
      if (!(emailVerified === true || emailVerified === "true")) return false;
      return isAllowedEmail(email);
    },
  },
};

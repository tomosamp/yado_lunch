"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function SignOutClient({ callbackUrl }: { callbackUrl: string }) {
  useEffect(() => {
    signOut({ callbackUrl });
  }, [callbackUrl]);

  return (
    <main className="auth">
      <section className="card auth__card">
        <h1 className="title">ログアウト中…</h1>
        <p className="muted">少々お待ちください。</p>
      </section>
    </main>
  );
}


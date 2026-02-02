"use client";

import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function LogoutPage() {
  const searchParams = useSearchParams();

  const callbackUrl = useMemo(() => {
    const raw = searchParams?.get("callbackUrl") ?? "/login";
    return raw.startsWith("/") ? raw : "/login";
  }, [searchParams]);

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


"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") router.replace("/spa/index.html");
  }, [router, status]);

  return (
    <main className="auth">
      <section className="card auth__card">
        <h1 className="title">ランチ会グルーピング</h1>
        <p className="muted">@yadokari.tv のGoogleアカウントでログインできます。</p>
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => signIn("google", { callbackUrl: "/spa/index.html" })}>
            Googleでログイン
          </button>
        </div>
      </section>
    </main>
  );
}

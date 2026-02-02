"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="container">
      <section className="card">
        <h1 className="title">ランチ会グルーピング</h1>
        <p className="muted">@yadokari.tv のGoogleアカウントでログインできます。</p>
        <div style={{ marginTop: 14 }}>
          <button className="btn" onClick={() => signIn("google")}>
            Googleでログイン
          </button>
        </div>
      </section>
    </main>
  );
}


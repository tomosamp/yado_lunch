# ランチ会グルーピング（Next.js + Googleログイン）

Vercel等にデプロイして使うことを想定した、社内ランチ会のグルーピング用Webアプリです。
ログインはGoogle（`@yadokari.tv` ドメイン検証）で行います。

## できること
- 社員（有効/無効、親=責任者フラグ）の管理
- 同席NG（ペア）の管理
- 親（責任者）を必ず含む **4人固定** グルーピング生成（指定月の月曜へ分散）
  - 第1週: 親A,B,C,D / 第2週: 親A,B,C,D ... の形式
  - 各グループは必ず4人（親 + メンバー3人）
  - 同じ月曜の中で同一メンバーは重複しない
  - 直近N回（デフォルト3回）の「同一グループになったペア」をなるべく減らす
- 生成結果をカード表示
- 生成履歴（全件）を月ごとに閲覧

## 起動方法
```bash
cd app
npm install
cp .env.example .env.local
npm run dev
```

ブラウザで `http://localhost:3000` を開き、Googleでログインすると `public/spa/index.html`（SPA本体）にリダイレクトします。

## Google OAuthの設定（最低限）
Google Cloud ConsoleでOAuthクライアントを作成し、以下を設定してください。
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - 本番: `https://<あなたのドメイン>/api/auth/callback/google`
- `.env.local` に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXTAUTH_URL` / `NEXTAUTH_SECRET`

## Vercelにデプロイする場合
- VercelのProject Settingsで **Root Directory を `app`** に設定してください。
- 環境変数は `.env.example` と同様に設定してください。

## データの保存場所
- 現状のデータはブラウザの `localStorage`（ユーザーごと/端末ごと）に保存されます。
- 共有したい場合は、画面の `エクスポート/インポート` を使ってJSONで移行できます（将来、DB共有に移行可能）。

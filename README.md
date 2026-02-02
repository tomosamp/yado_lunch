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
- Googleカレンダーに一括で予定作成（招待通知 `sendUpdates=all`）

## 起動方法
```bash
npm install
cp .env.example .env.local
npm run dev
```

ブラウザで `http://localhost:3000` を開き、Googleでログインすると `public/spa/index.html`（SPA本体）にリダイレクトします。

※カレンダー登録を使う場合、Googleログイン時に権限許可が必要です（権限追加後は一度ログアウト→再ログイン推奨）。

## Google OAuthの設定（最低限）
Google Cloud ConsoleでOAuthクライアントを作成し、以下を設定してください。
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/callback/google`
  - 本番: `https://<あなたのドメイン>/api/auth/callback/google`
- `.env.local` に `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `NEXTAUTH_URL` / `NEXTAUTH_SECRET`

## Vercelにデプロイする場合
- リポジトリの直下がこのNext.jsプロジェクトなら、そのままでOKです。
  - もしリポジトリ直下に `app/` があり、その配下がNext.jsプロジェクトになっている構成なら、VercelのProject Settingsで **Root Directory を `app`** に設定してください。
- 環境変数は `.env.example` と同様に設定してください。
- 共有・永続化のために **Postgres（Supabase/Neon/Vercel Postgres等）** を接続するのがおすすめです（未接続でもlocalStorageで動作します）。

## データの保存場所
- 既定は **DB（Postgres） + localStorage（キャッシュ）** です。
  - DB未接続時は localStorage のみで動作します。
  - 共有したい場合はPostgresを接続してください（運営/閲覧者で同じデータになります）。
- 画面の `エクスポート/インポート` を使ってJSONでバックアップ/移行もできます。

### SupabaseでDBを用意する場合（例）
- Vercelの `Storage` で `Create Database` → `Supabase` を選んで接続
- Vercelの環境変数に `DATABASE_URL`（または `POSTGRES_URL`）が入っていればOKです（`NEXT_PUBLIC_` は付けない）

#### DB同期が `SELF_SIGNED_CERT_IN_CHAIN` になる場合
Supabase接続で証明書チェーン検証が失敗している状態です。アプリ側で回避する実装を入れていますが、反映されていない場合は最新デプロイに更新してください。

import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "ランチ会グルーピング",
  description: "yadokari用 ランチ会グルーピング",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}


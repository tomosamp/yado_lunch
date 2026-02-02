import SignOutClient from "./SignOutClient";

function normalizeCallbackUrl(raw: unknown): string {
  if (typeof raw !== "string") return "/login";
  // open redirect 防止: 相対パスのみ許可
  return raw.startsWith("/") ? raw : "/login";
}

export default function LogoutPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const callbackRaw = searchParams?.callbackUrl;
  const callbackUrl = normalizeCallbackUrl(Array.isArray(callbackRaw) ? callbackRaw[0] : callbackRaw);
  return <SignOutClient callbackUrl={callbackUrl} />;
}


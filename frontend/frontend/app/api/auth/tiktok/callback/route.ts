import { NextRequest, NextResponse } from "next/server";
import { saveTokens } from "../../../../../lib/tiktokTokens";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_APP_URL!;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${base}/?tiktok=error`);
  }
  if (state !== req.cookies.get("tiktok_state")?.value) {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    }),
  });
  const data = await tokenRes.json();

  if (!tokenRes.ok || data.error || !data.access_token) {
    return NextResponse.redirect(`${base}/?tiktok=error`);
  }

  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });

  const res = NextResponse.redirect(`${base}/?tiktok=connected`);
  res.cookies.delete("tiktok_state");
  return res;
}
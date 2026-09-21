import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    scope: "user.info.basic,video.upload",
    response_type: "code",
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    state,
  });

  const res = NextResponse.redirect(
    `https://www.tiktok.com/v2/auth/authorize/?${params}`
  );
  res.cookies.set("tiktok_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
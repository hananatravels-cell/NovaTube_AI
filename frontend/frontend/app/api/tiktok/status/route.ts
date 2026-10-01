import { NextRequest, NextResponse } from "next/server";
import { getTikTokAccessToken } from "../../../../lib/tiktokTokens";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { publishId } = await req.json();
  if (!publishId) return NextResponse.json({ error: "publishId is required" }, { status: 400 });

  const token = await getTikTokAccessToken();
  if (!token) return NextResponse.json({ error: "TikTok not connected" }, { status: 401 });

  const res = await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
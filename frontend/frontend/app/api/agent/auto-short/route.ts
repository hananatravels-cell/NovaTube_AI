import { NextRequest, NextResponse } from "next/server";
import { Agent, setGlobalDispatcher } from "undici";

setGlobalDispatcher(
  new Agent({
    headersTimeout: 10 * 60 * 1000,
    bodyTimeout: 10 * 60 * 1000,
  })
);

const VIDEO_SERVICE_URL =
  process.env.VIDEO_SERVICE_URL || "http://localhost:8002";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { video_base64, script, category, min_duration = 20, max_duration = 59 } = body;

    if (!video_base64) {
      return NextResponse.json(
        { error: "video_base64 is required" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8 * 60 * 1000);

    const response = await fetch(`${VIDEO_SERVICE_URL}/auto-short`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ video_base64, script, category, min_duration, max_duration }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `video-service error: ${errText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Auto Short generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate Auto Short" },
      { status: 500 }
    );
  }
}
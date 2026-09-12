import { NextRequest, NextResponse } from "next/server";
import { Agent, setGlobalDispatcher } from "undici";

// Same fix used in api/agent/video/route.ts for long-running requests
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
  const { video_base64, start_seconds = 0, max_duration = 59, category, language = "Urdu" } = body;

    if (!video_base64) {
      return NextResponse.json(
        { error: "video_base64 is required" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8 * 60 * 1000); // 8 min, same as video route

    const response = await fetch(`${VIDEO_SERVICE_URL}/make-short`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
        video_base64,
        start_seconds,
        max_duration,
        category,
        language,
      }),
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

    return NextResponse.json({
      video: data.video, // data:video/mp4;base64,...
    });
  } catch (err: any) {
    console.error("Shorts generation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate short" },
      { status: 500 }
    );
  }
}
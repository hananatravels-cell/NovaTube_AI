import { NextRequest, NextResponse } from "next/server";
import { Agent, setGlobalDispatcher } from "undici";

// Timeout settings badha di hain taaki lambi video ke liye server crash na ho
setGlobalDispatcher(
  new Agent({
    headersTimeout: 10 * 60 * 1000, // 10 minutes
    bodyTimeout: 10 * 60 * 1000,    // 10 minutes
  })
);

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || "http://localhost:8002";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Frontend se aane wale sabhi possible variables ko accept karein
    const { 
      video_base64, 
      video_path, 
      job_id, 
      video_url, 
      script, 
      category, 
      num_shorts, 
      min_duration = 20, 
      max_duration = 59 
    } = body;

    let finalVideoSource = video_path;

    // SMART FIX: Agar local path nahi hai, toh video_url use karein
    if (!finalVideoSource && video_url) {
      // Agar URL relative hai (jaise "/api/agent/video-file/123"), toh uske aage localhost:3000 laga den
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      finalVideoSource = video_url.startsWith("http") ? video_url : `${baseUrl}${video_url}`;
    }

    // Validation: Kam se kam ek source hona zaroori hai
    if (!video_base64 && !finalVideoSource) {
      return NextResponse.json(
        { error: "video_path ya video_url dono mein se koi ek chahiye" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    // 8 minute ka timeout, taaki process hang na ho
    const timeout = setTimeout(() => controller.abort(), 8 * 60 * 1000);

    // Python Video Service ko request bhejna
    const response = await fetch(`${VIDEO_SERVICE_URL}/auto-short`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        video_base64, 
        video_path: finalVideoSource, // Python service is URL se khud video download kar legi
        script, 
        category, 
        num_shorts, 
        min_duration, 
        max_duration 
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
    return NextResponse.json(data);
    
  } catch (err: any) {
    console.error("Auto Short generation failed:", err);
    
    // Timeout error ko gracefully handle karna
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { error: "Shorts generation timed out. Video might be too long or server is busy." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: err?.message || "Failed to generate Auto Short" },
      { status: 500 }
    );
  }
}
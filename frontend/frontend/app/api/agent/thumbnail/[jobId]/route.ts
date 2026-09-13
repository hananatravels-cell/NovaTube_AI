import { NextRequest, NextResponse } from "next/server";

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || "http://141.145.148.233:8002";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const text = req.nextUrl.searchParams.get("text") || "";
  try {
    const res = await fetch(
      `${VIDEO_SERVICE_URL}/thumbnail/${jobId}?text=${encodeURIComponent(text)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      return NextResponse.json({ error: errText }, { status: res.status });
    }
    const imageBuffer = await res.arrayBuffer();
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate thumbnail" }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || "http://localhost:8002";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const text = req.nextUrl.searchParams.get("text") || "";
  try {
    const res = await fetch(
      `${VIDEO_SERVICE_URL}/thumbnail/${jobId}?text=${encodeURIComponent(text)}`
    );
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate thumbnail" }, { status: 500 });
  }
}
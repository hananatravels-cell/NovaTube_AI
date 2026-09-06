import { NextRequest, NextResponse } from 'next/server';

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://127.0.0.1:8002';

// Streams the finished render straight through from the video service
// as a plain file, instead of it ever being embedded as base64 inside
// a JSON response. This is what the video <video> tag, the download
// button, and (after converting to base64 client-side) publishing all
// pull the finished file from.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  }

  const fileRes = await fetch(`${VIDEO_SERVICE_URL}/video-file/${jobId}`);

  if (!fileRes.ok || !fileRes.body) {
    return NextResponse.json({ error: 'Video not available' }, { status: fileRes.status || 404 });
  }

  return new NextResponse(fileRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'inline; filename="novatube-video.mp4"',
      'Cache-Control': 'no-store',
    },
  });
}

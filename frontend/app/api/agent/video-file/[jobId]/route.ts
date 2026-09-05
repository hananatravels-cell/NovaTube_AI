import { NextResponse } from 'next/server';

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://127.0.0.1:8002';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const upstream = await fetch(`${VIDEO_SERVICE_URL}/video-file/${jobId}`);

  if (!upstream.ok) {
    return NextResponse.json({ error: 'Video not available' }, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': 'attachment; filename="novatube-video.mp4"',
    },
  });
}

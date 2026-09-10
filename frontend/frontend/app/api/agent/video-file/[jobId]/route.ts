import { NextRequest, NextResponse } from 'next/server';

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://127.0.0.1:8002';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    // Forward the browser's Range header (if any) to the upstream
    // video service. Without this, the video's <video> element can
    // play from the start but CANNOT seek — thumbnail extraction
    // seeks to several timestamps and hangs/times out because the
    // server never responds with a partial (206) range.
    const range = req.headers.get('range');
    const upstreamHeaders: Record<string, string> = {};
    if (range) upstreamHeaders['Range'] = range;

    const fileRes = await fetch(`${VIDEO_SERVICE_URL}/video-file/${jobId}`, {
      headers: upstreamHeaders,
    });

    if (!fileRes.ok && fileRes.status !== 206) {
      return NextResponse.json({ error: 'Video not available' }, { status: fileRes.status || 404 });
    }
    if (!fileRes.body) {
      return NextResponse.json({ error: 'Video not available' }, { status: 404 });
    }

    // Mirror the upstream's status (200 for a full response, 206 for
    // a partial/range response) and range-related headers so the
    // browser knows seeking is supported.
    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Cache-Control', 'no-store');
    headers.set('Accept-Ranges', 'bytes');

    const contentRange = fileRes.headers.get('content-range');
    if (contentRange) headers.set('Content-Range', contentRange);

    const contentLength = fileRes.headers.get('content-length');
    if (contentLength) headers.set('Content-Length', contentLength);

    return new NextResponse(fileRes.body, {
      status: fileRes.status,
      headers,
    });
  } catch (err) {
    console.error('agent/video-file error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
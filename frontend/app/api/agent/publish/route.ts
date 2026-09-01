import { NextRequest, NextResponse } from 'next/server';
import { Agent, setGlobalDispatcher } from 'undici';

// Large video uploads to the YouTube service can legitimately take
// several minutes (upload bandwidth + YouTube API processing time).
// Node's default undici headers-timeout is much shorter than that, so
// without this the connection gets killed mid-upload with a
// "HeadersTimeoutError" even though the upload was still progressing
// — this mirrors the same fix already applied in the video-generation
// route for the same underlying reason.
setGlobalDispatcher(new Agent({ headersTimeout: 15 * 60 * 1000, bodyTimeout: 15 * 60 * 1000 }));

const YOUTUBE_SERVICE_URL = process.env.YOUTUBE_SERVICE_URL || 'http://127.0.0.1:8003';

export async function POST(req: NextRequest) {
  try {
    const { videoBase64, thumbnailBase64, title, description, tags, account, publishAt } = await req.json();

    if (!videoBase64 || !title) {
      return NextResponse.json({ error: 'Video and title are required' }, { status: 400 });
    }

    const res = await fetch(`${YOUTUBE_SERVICE_URL}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_base64: videoBase64,
        thumbnail_base64: thumbnailBase64 || null,
        title,
        description: description || '',
        tags: tags || [],
        account: account || 'default',
        publish_at: publishAt || null,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('YouTube service error:', errText);
      return NextResponse.json(
        { error: 'YouTube upload failed. Is the YouTube service running on port 8003?' },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ videoId: data.video_id, videoUrl: data.video_url });
  } catch (err) {
    console.error('agent/publish error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
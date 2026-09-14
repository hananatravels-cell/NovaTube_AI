import { NextRequest, NextResponse } from 'next/server';
import { Agent, setGlobalDispatcher } from 'undici';

setGlobalDispatcher(new Agent({ headersTimeout: 15 * 60 * 1000, bodyTimeout: 15 * 60 * 1000 }));

const YOUTUBE_SERVICE_URL = process.env.YOUTUBE_SERVICE_URL || 'http://127.0.0.1:8003';

export async function POST(req: NextRequest) {
  try {
    const { videoPath, thumbnailPath, videoBase64, thumbnailBase64, title, description, tags, account, publishAt } = await req.json();

    if ((!videoPath && !videoBase64) || !title) {
      return NextResponse.json({ error: 'Video and title are required' }, { status: 400 });
    }

    const useDirectPath = !!videoPath;
    const hasThumbBase64 = !!thumbnailBase64;

    let endpoint: string;
    let body: any;

    if (useDirectPath && hasThumbBase64) {
      endpoint = 'upload-from-path-with-thumb-b64';
      body = {
        video_path: videoPath,
        thumbnail_base64: thumbnailBase64,
        title,
        description: description || '',
        tags: tags || [],
        account: account || 'default',
        publish_at: publishAt || null,
      };
    } else if (useDirectPath) {
      endpoint = 'upload-from-path';
      body = {
        video_path: videoPath,
        thumbnail_path: thumbnailPath || null,
        title,
        description: description || '',
        tags: tags || [],
        account: account || 'default',
        publish_at: publishAt || null,
      };
    } else {
      endpoint = 'upload';
      body = {
        video_base64: videoBase64,
        thumbnail_base64: thumbnailBase64 || null,
        title,
        description: description || '',
        tags: tags || [],
        account: account || 'default',
        publish_at: publishAt || null,
      };
    }

    const res = await fetch(`${YOUTUBE_SERVICE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
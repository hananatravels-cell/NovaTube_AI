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

    const statusRes = await fetch(`${VIDEO_SERVICE_URL}/video-status/${jobId}`);

    if (statusRes.status === 404) {
      return NextResponse.json({ error: 'Unknown job_id' }, { status: 404 });
    }

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      console.error('Video status error:', errText);
      return NextResponse.json({ error: 'Could not fetch job status' }, { status: 500 });
    }

    const data = await statusRes.json();

    return NextResponse.json({
      status: data.status,
      stage: data.stage,
      scenesDone: data.scenes_done,
      scenesTotal: data.scenes_total,
      error: data.error,
      video: data.video,
      duration: data.duration,
      musicUsed: data.music_used,
    });
  } catch (err) {
    console.error('agent/video-status error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
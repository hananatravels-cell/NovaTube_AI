import { NextRequest, NextResponse } from 'next/server';

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://127.0.0.1:8002';

function computeTargetScenes(wordCount: number): number {
  const scenes = Math.round(wordCount / 45);
  return Math.min(Math.max(scenes, 6), 40);
}

function splitIntoScenes(script: string, targetScenes: number): string[] {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length === 0) return [script];

  const perScene = Math.max(1, Math.ceil(sentences.length / targetScenes));
  const scenes: string[] = [];
  for (let i = 0; i < sentences.length; i += perScene) {
    scenes.push(sentences.slice(i, i + perScene).join(' '));
  }
  return scenes;
}

export async function POST(req: NextRequest) {
  try {
    const {
      script,
      audioBase64,
      category,
      orientation,
      scenes: providedScenes,
      introAudioBase64,
      introText,
    } = await req.json();

    if (!script || !audioBase64) {
      return NextResponse.json({ error: 'Script and audio are required' }, { status: 400 });
    }

    // Prefer AI-crafted visual scene descriptions (from /api/agent/scenes)
    // when the caller supplies them — these describe concrete, filmable
    // imagery instead of literal narration text, so stock footage search
    // stays on-topic. Fall back to naive text splitting if not provided.
    let scenes: string[];
    if (Array.isArray(providedScenes) && providedScenes.length > 0) {
      scenes = providedScenes.map(String).filter((s: string) => s.trim());
    } else {
      const wordCount = script.trim().split(/\s+/).length;
      const targetScenes = computeTargetScenes(wordCount);
      scenes = splitIntoScenes(script, targetScenes);
    }

    // Kick off the render as a background job on the video service and
    // hand back its job_id immediately — the client polls
    // /api/agent/video-status/{jobId} for progress instead of this route
    // holding the request open for the whole render (which is what
    // caused fixed-timeout aborts on longer/slower renders before).
    const startRes = await fetch(`${VIDEO_SERVICE_URL}/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes,
        category: category || 'storytelling',
        audio_base64: audioBase64,
        orientation: orientation || 'vertical',
        want_music: true,
        intro_audio_base64: introAudioBase64 || null,
        intro_text: introText || '',
      }),
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      console.error('Video service error starting job:', errText);
      return NextResponse.json(
        { error: 'Video assembly failed to start. Is the video service running on port 8002?' },
        { status: 500 }
      );
    }

    const startData = await startRes.json();
    const jobId = startData.job_id;

    if (!jobId) {
      console.error('Video service did not return a job_id:', startData);
      return NextResponse.json({ error: 'Video service did not return a job_id' }, { status: 500 });
    }

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error('agent/video error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
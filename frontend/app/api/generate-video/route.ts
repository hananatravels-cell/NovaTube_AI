import { NextRequest, NextResponse } from 'next/server';

const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://127.0.0.1:8001';
const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://127.0.0.1:8002';

// Splits a script into rough scene chunks so each gets its own visual.
function splitIntoScenes(script: string, targetScenes = 6): string[] {
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
    const { script, voice, language, category, orientation } = await req.json();

    if (!script || !script.trim()) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    // 1. Generate the narration voiceover
    const voiceRes = await fetch(`${TTS_SERVICE_URL}/generate-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: script,
        voice: voice || 'Aria — Warm & Clear',
        language: language || 'English',
      }),
    });

    if (!voiceRes.ok) {
      const errText = await voiceRes.text();
      console.error('Voice generation failed:', errText);
      return NextResponse.json(
        { error: 'Voice generation failed. Is the TTS service running on port 8001?' },
        { status: 500 }
      );
    }

    const voiceData = await voiceRes.json();
    const audioBase64: string = voiceData.audio;

    // 2. Break the script into scenes for visual matching
    const scenes = splitIntoScenes(script, 6);

    // 3. Send scenes + narration audio to the video service
    const videoRes = await fetch(`${VIDEO_SERVICE_URL}/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes,
        category: category || 'storytelling',
        audio_base64: audioBase64,
        orientation: orientation || 'vertical',
      }),
    });

    if (!videoRes.ok) {
      const errText = await videoRes.text();
      console.error('Video generation failed:', errText);
      return NextResponse.json(
        { error: 'Video generation failed. Is the video service running on port 8002?' },
        { status: 500 }
      );
    }

    const videoData = await videoRes.json();

    return NextResponse.json({
      video: videoData.video,
      duration: videoData.duration,
      scenesUsed: videoData.scenes_used,
    });
  } catch (err) {
    console.error('generate-video route error:', err);
    return NextResponse.json(
      { error: 'Something went wrong while generating the video.' },
      { status: 500 }
    );
  }
}
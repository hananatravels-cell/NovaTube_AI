import { NextRequest, NextResponse } from 'next/server';

const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://127.0.0.1:8001';

export async function POST(req: NextRequest) {
  try {
    const { text, voice, language } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    const response = await fetch(`${TTS_SERVICE_URL}/generate-voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, language }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('TTS service error:', errText);
      return NextResponse.json(
        { error: 'Voice generation failed. Is the Python TTS service running on port 8001?' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('generate-voice route error:', err);
    return NextResponse.json(
      { error: 'Could not reach the TTS service. Make sure it is running (uvicorn tts_service:app --port 8001).' },
      { status: 500 }
    );
  }
}
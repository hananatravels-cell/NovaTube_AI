import { NextRequest, NextResponse } from 'next/server';

const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://127.0.0.1:8001';

export async function POST(req: NextRequest) {
  try {
    const { text, voice, language } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    let audioBase64: string | null = null;
    let ttsSource = 'local';

    // 1. Pehle Local TTS Service try karein
    try {
      const response = await fetch(`${TTS_SERVICE_URL}/generate-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, language }),
      });

      if (response.ok) {
        const data = await response.json();
        audioBase64 = data.audio_base64;
      } else {
        console.warn('⚠️ Local TTS failed, falling back to ElevenLabs direct API...');
        ttsSource = 'elevenlabs_fallback';
      }
    } catch (localErr) {
      console.warn('⚠️ Local TTS unreachable, falling back to ElevenLabs direct API...', localErr);
      ttsSource = 'elevenlabs_fallback';
    }

    // 2. Agar Local fail hua, toh direct ElevenLabs API call karein
    if (!audioBase64 && process.env.ELEVENLABS_API_KEY) {
      try {
        console.log('🔄 Attempting direct ElevenLabs fallback...');
        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
        
        const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 }
          }),
        });

        if (elevenRes.ok) {
          const audioBuffer = await elevenRes.arrayBuffer();
          audioBase64 = Buffer.from(audioBuffer).toString('base64');
          console.log('✅ ElevenLabs fallback successful!');
        } else {
          const errText = await elevenRes.text();
          console.error('❌ ElevenLabs fallback also failed:', errText);
        }
      } catch (elevenErr) {
        console.error('❌ ElevenLabs direct call failed:', elevenErr);
      }
    }

    // 3. Final Check
    if (!audioBase64) {
      return NextResponse.json(
        { error: 'Voice generation failed. Both local TTS and ElevenLabs fallback failed.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ audio_base64: audioBase64, source: ttsSource });

  } catch (err) {
    console.error('generate-voice route error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

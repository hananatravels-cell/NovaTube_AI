import { NextRequest, NextResponse } from 'next/server';

const TTS_SERVICE_URL = process.env.TTS_SERVICE_URL || 'http://127.0.0.1:8001';

export async function POST(req: NextRequest) {
  try {
    const { text, voice, language } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    let audioBase64: string | null = null;
    let ttsSource = 'unknown';

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
        ttsSource = 'local';
      } else {
        console.warn('⚠️ Local TTS failed, moving to fallback 1 (ElevenLabs)...');
      }
    } catch (localErr) {
      console.warn('⚠️ Local TTS unreachable, moving to fallback 1 (ElevenLabs)...', localErr);
    }

    // 2. Fallback 1: ElevenLabs Direct API
    if (!audioBase64 && process.env.ELEVENLABS_API_KEY) {
      try {
        console.log('🔄 Attempting ElevenLabs fallback...');
        const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Default Adam
        
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
          ttsSource = 'elevenlabs';
          console.log('✅ ElevenLabs fallback successful!');
        } else {
          console.warn('⚠️ ElevenLabs failed, moving to fallback 2 (OpenRouter)...');
        }
      } catch (elevenErr) {
        console.warn('⚠️ ElevenLabs direct call failed, moving to fallback 2 (OpenRouter)...', elevenErr);
      }
    }

    // 3. Fallback 2: OpenRouter TTS (OpenAI Compatible)
    if (!audioBase64 && process.env.OPENROUTER_API_KEY) {
      try {
        console.log('🔄 Attempting OpenRouter TTS fallback...');
        const openRouterRes = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://novatube.ai',
            'X-Title': 'NovaTube AI'
          },
          body: JSON.stringify({
            model: 'openai/tts-1',
            input: text,
            voice: 'alloy' // alloy, echo, fable, onyx, nova, or shimmer
          }),
        });

        if (openRouterRes.ok) {
          const audioBuffer = await openRouterRes.arrayBuffer();
          audioBase64 = Buffer.from(audioBuffer).toString('base64');
          ttsSource = 'openrouter';
          console.log('✅ OpenRouter TTS fallback successful!');
        } else {
          const errText = await openRouterRes.text();
          console.warn('⚠️ OpenRouter TTS failed:', errText);
        }
      } catch (openRouterErr) {
        console.warn('⚠️ OpenRouter TTS call failed:', openRouterErr);
      }
    }

    // 4. Final Check
    if (!audioBase64) {
      return NextResponse.json(
        { error: 'Voice generation failed. Local, ElevenLabs, and OpenRouter TTS all failed.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ audio_base64: audioBase64, source: ttsSource });

  } catch (err) {
    console.error('generate-voice route error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

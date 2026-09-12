import io, os
path = "frontend/app/api/agent/voice-select/route.ts"
os.makedirs(os.path.dirname(path), exist_ok=True)
content = '''import { NextRequest, NextResponse } from 'next/server';

const VOICE_OPTIONS = [
  { id: 'aria', label: 'Aria — Warm & Clear' },
  { id: 'noah', label: 'Noah — Deep & Confident' },
  { id: 'maya', label: 'Maya — Bright & Energetic' },
  { id: 'zayn', label: 'Zayn — Calm & Reflective' },
];

export async function POST(req: NextRequest) {
  try {
    const { topic, category } = await req.json();

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const optionsList = VOICE_OPTIONS.map((v) => `${v.id}: ${v.label}`).join('\\n');

    const prompt = `Pick the single best voiceover style for a YouTube video with this topic and category.

Topic: "${topic}"
Category: "${category || 'general'}"

Available voices:
${optionsList}

Reply with ONLY the voice id (one of: ${VOICE_OPTIONS.map((v) => v.id).join(', ')}). Nothing else.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are an expert audio director. Reply with only the requested id, nothing else.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq voice-select error:', errText);
      return NextResponse.json({ voice: 'aria' });
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim().toLowerCase();
    const match = VOICE_OPTIONS.find((v) => raw.includes(v.id));

    return NextResponse.json({ voice: match ? match.id : 'aria' });
  } catch (err) {
    console.error('agent/voice-select error:', err);
    return NextResponse.json({ voice: 'aria' });
  }
}
'''
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
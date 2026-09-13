import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { niche } = await req.json();

    if (!niche || !niche.trim()) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const prompt = `You are a YouTube trend strategist. Suggest ONE compelling, timely video topic for the niche: "${niche}".

Return ONLY valid JSON, no extra text:
{
  "topic": "the specific video topic/title",
  "angle": "one sentence on why this angle would perform well right now"
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are a YouTube trend strategist. Always respond with valid JSON only, no markdown formatting.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq topic error:', errText);
      return NextResponse.json({ error: 'Topic generation failed' }, { status: 500 });
    }

    const data = await response.json();
    let raw = data.choices[0].message.content.trim();
    raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('agent/topic error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
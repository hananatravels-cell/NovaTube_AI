import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { niche } = await req.json();

    if (!niche || !niche.trim()) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const prompt = `You are a YouTube trends analyst. Based on your knowledge of what's currently popular and viral, suggest 5 specific, highly engaging video topic ideas within the niche "${niche}" that are trending right now or have strong viral potential.

For each topic, briefly explain (1 short sentence) why it's currently resonating with audiences.

Respond with ONLY valid JSON, no extra text, in this exact format:
{"topics": [{"title": "<specific video topic>", "reason": "<why it's trending>"}]}`;

    const messages = [
      { role: 'system', content: 'You are a YouTube trends analyst who identifies viral, high-engagement video topic ideas. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ];

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.9,
      }),
    });

    if (response.status === 429 && process.env.OPENROUTER_API_KEY) {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages,
          temperature: 0.9,
        }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error('Trending topics error:', errText);
      return NextResponse.json({ error: 'Could not fetch trending topics' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    const parsed = JSON.parse(match[0]);
    return NextResponse.json({ topics: parsed.topics || [] });
  } catch (err) {
    console.error('agent/trending error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
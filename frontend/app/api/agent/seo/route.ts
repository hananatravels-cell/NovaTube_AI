import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { topic, script } = await req.json();

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const prompt = `You are an expert YouTube SEO strategist. Based on this video topic and script, generate optimized metadata for maximum discoverability and click-through rate.

TOPIC: "${topic}"

SCRIPT: "${(script || '').slice(0, 1000)}"

Return ONLY valid JSON with these exact keys, nothing else — no markdown, no explanation:
{
  "title": "high-CTR YouTube title, under 70 characters",
  "description": "2-4 sentence keyword-rich description, under 500 characters",
  "tags": ["12 to 15 relevant SEO keywords, no # symbol, lowercase"],
  "hashtags": ["6 to 8 hashtags including the # symbol, no spaces, e.g. #shorts"]
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
          {
            role: 'system',
            content: 'You are an expert YouTube SEO strategist. Output ONLY valid JSON, no other text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq SEO error:', errText);
      return NextResponse.json({ error: 'SEO generation failed' }, { status: 500 });
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'SEO response was not valid JSON' }, { status: 500 });
    }

    const title = typeof parsed.title === 'string' ? parsed.title.slice(0, 100) : '';
    const description = typeof parsed.description === 'string' ? parsed.description.slice(0, 600) : '';
    const tags = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 15).map(String) : [];
    const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 10).map(String) : [];

    if (!title) {
      return NextResponse.json({ error: 'SEO generation returned incomplete data' }, { status: 500 });
    }

    return NextResponse.json({ title, description, tags, hashtags });
  } catch (err) {
    console.error('agent/seo error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
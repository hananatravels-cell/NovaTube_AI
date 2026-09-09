import { NextRequest, NextResponse } from 'next/server';

function computeTargetScenes(wordCount: number): number {
  const scenes = Math.round(wordCount / 45);
  return Math.min(Math.max(scenes, 6), 40);
}

export async function POST(req: NextRequest) {
  try {
    const { topic, script, category } = await req.json();

    if (!topic || !script) {
      return NextResponse.json({ error: 'Topic and script are required' }, { status: 400 });
    }

    const wordCount = script.trim().split(/\s+/).length;
    const targetScenes = computeTargetScenes(wordCount);

    const prompt = `You are a video editor and thumbnail designer planning assets for this narration script.

TOPIC: "${topic}"
CATEGORY: "${category || 'general'}"

SCRIPT:
"""
${script}
"""

1. Break this script into exactly ${targetScenes} sequential visual scene descriptions, in the same order the script flows. Each description must describe something CONCRETE and FILMABLE that could exist as real stock video footage (people, places, objects, actions, nature, textures) — never abstract ideas, emotions, or concepts on their own. Each should be 5-10 words. These will be used as stock footage search queries, so be specific and visual (e.g. "hands writing in an old journal" not "reflecting on the past").

2. Write one vivid, attention-grabbing visual description (10-15 words) of the single most compelling moment or image from this topic, suitable as the basis for a YouTube thumbnail background image. It should be concrete and filmable too.

3. Write a short punchy thumbnail overlay text (2-5 words, ALL CAPS, like real YouTube thumbnails use) that is SPECIFIC to this exact topic — not a generic phrase. It should tease the topic's hook or most surprising/valuable point. Respect the tone of the category (e.g. calm and respectful for religious/educational topics, high-energy for entertainment/comedy topics).

Return ONLY valid JSON with this exact shape, nothing else:
{ "scenes": ["scene 1", "scene 2", ... exactly ${targetScenes} items], "thumbnailPrompt": "...", "thumbnailText": "..." }`;

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
            content: 'You are an expert video editor and thumbnail designer. Output ONLY valid JSON, no other text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq scenes error:', errText);
      return NextResponse.json({ error: 'Scene planning failed' }, { status: 500 });
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Scene planning returned invalid JSON' }, { status: 500 });
    }

    const scenes: string[] = Array.isArray(parsed.scenes)
      ? parsed.scenes.map(String).filter((s: string) => s.trim())
      : [];
    const thumbnailPrompt: string =
      typeof parsed.thumbnailPrompt === 'string' && parsed.thumbnailPrompt.trim()
        ? parsed.thumbnailPrompt.trim()
        : topic;
    const thumbnailText: string =
      typeof parsed.thumbnailText === 'string' && parsed.thumbnailText.trim()
        ? parsed.thumbnailText.trim().slice(0, 40)
        : 'WATCH NOW';

    if (scenes.length === 0) {
      return NextResponse.json({ error: 'No scenes were generated' }, { status: 500 });
    }

    return NextResponse.json({ scenes, thumbnailPrompt, thumbnailText });
  } catch (err) {
    console.error('agent/scenes error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

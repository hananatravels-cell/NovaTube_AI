import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

interface TopicEntry {
  id: string;
  text: string;
  used: boolean;
  usedAt: string | null;
}

interface TopicBankFile {
  niche: string;
  createdAt: string;
  updatedAt: string;
  topics: TopicEntry[];
}

const BANK_DIR = path.join(process.cwd(), 'data', 'topic-banks');

function slugifyNiche(niche: string): string {
  return (
    niche
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'general'
  );
}

function bankPath(slug: string): string {
  return path.join(BANK_DIR, `${slug}.json`);
}

async function readBank(slug: string): Promise<TopicBankFile | null> {
  try {
    const raw = await fs.readFile(bankPath(slug), 'utf-8');
    return JSON.parse(raw) as TopicBankFile;
  } catch {
    return null;
  }
}

async function writeBank(slug: string, data: TopicBankFile): Promise<void> {
  await fs.mkdir(BANK_DIR, { recursive: true });
  await fs.writeFile(bankPath(slug), JSON.stringify(data, null, 2), 'utf-8');
}

async function requestTopicBatch(niche: string, avoidBlock: string, batchSize: number): Promise<string[]> {
  const prompt = `Generate up to ${batchSize} distinct video topic ideas for a YouTube channel in the niche: "${niche}".

Each topic should be a short, specific angle or subject (6-12 words) that a full video could be made about — not a full clickbait title, just the core topic idea. Cover a wide variety of angles: educational, storytelling, listicle, myth-busting, historical, practical/how-to, current relevance, and emotional/inspirational where fitting for the niche. Make each one genuinely distinct from the others. It is fine to return fewer than ${batchSize} if that keeps every item high quality — do not pad with weak or repetitive ideas.${avoidBlock}

Return ONLY valid JSON with this exact shape, nothing else:
{ "topics": ["topic 1", "topic 2", ...] }`;

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
          content: 'You are a YouTube content strategist. Output ONLY valid JSON, no other text.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      // Kept well under this account's Groq per-minute token limit — the
      // requested max_tokens counts against that limit even if the actual
      // response is shorter.
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Groq topic-bank error:', errText);
    return [];
  }

  const data = await response.json();
  const raw = data.choices[0].message.content.trim();

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.topics) ? parsed.topics.map(String) : [];
  } catch {
    console.error('Topic batch returned invalid JSON, skipping this batch');
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { niche } = await req.json();
    if (!niche || !niche.trim()) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const slug = slugifyNiche(niche);
    const existing = await readBank(slug);
    const existingTexts = existing ? existing.topics.map((t) => t.text) : [];
    const existingLower = new Set(existingTexts.map((t) => t.toLowerCase().trim()));

    const newEntries: TopicEntry[] = [];

    // Ask in small batches of ~30 with a pause between each — this stays
    // comfortably under a single free-tier Groq account's per-minute
    // token budget, and each smaller response is far less likely to get
    // cut off mid-generation.
    for (let batch = 0; batch < 4 && newEntries.length < 100; batch++) {
      const avoidSample = [...existingTexts, ...newEntries.map((e) => e.text)].slice(-40);
      const avoidBlock =
        avoidSample.length > 0
          ? `\n\nAvoid repeating or closely rephrasing any of these already-used topic ideas:\n${avoidSample.map((t) => `- ${t}`).join('\n')}`
          : '';

      const rawTopics = await requestTopicBatch(niche, avoidBlock, 30);

      for (const text of rawTopics) {
        const clean = text.trim();
        if (!clean) continue;
        const lower = clean.toLowerCase();
        if (existingLower.has(lower)) continue;
        existingLower.add(lower);
        newEntries.push({ id: randomUUID(), text: clean, used: false, usedAt: null });
      }

      if (batch < 3) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (newEntries.length === 0) {
      return NextResponse.json({ error: 'No new topics were generated' }, { status: 500 });
    }

    const now = new Date().toISOString();
    const merged: TopicBankFile = {
      niche,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      topics: [...(existing?.topics || []), ...newEntries],
    };

    await writeBank(slug, merged);

    return NextResponse.json({
      added: newEntries.length,
      total: merged.topics.length,
    });
  } catch (err) {
    console.error('topic-bank/generate error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

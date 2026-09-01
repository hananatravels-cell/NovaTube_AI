import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

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

export async function POST(req: NextRequest) {
  try {
    const { niche } = await req.json();
    if (!niche || !niche.trim()) {
      return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
    }

    const slug = slugifyNiche(niche);
    const bank = await readBank(slug);

    if (!bank) {
      return NextResponse.json({ topic: null, remaining: 0 });
    }

    const next = bank.topics.find((t) => !t.used);
    if (!next) {
      return NextResponse.json({ topic: null, remaining: 0 });
    }

    next.used = true;
    next.usedAt = new Date().toISOString();
    bank.updatedAt = next.usedAt;
    await writeBank(slug, bank);

    const remaining = bank.topics.filter((t) => !t.used).length;

    return NextResponse.json({
      topic: { id: next.id, text: next.text },
      remaining,
    });
  } catch (err) {
    console.error('topic-bank/next error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
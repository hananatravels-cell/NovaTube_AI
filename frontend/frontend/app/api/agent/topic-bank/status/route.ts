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

export async function GET(req: NextRequest) {
  const niche = req.nextUrl.searchParams.get('niche') || '';
  if (!niche.trim()) {
    return NextResponse.json({ error: 'Niche is required' }, { status: 400 });
  }

  const slug = slugifyNiche(niche);
  const bank = await readBank(slug);

  if (!bank) {
    return NextResponse.json({ exists: false, total: 0, used: 0, remaining: 0 });
  }

  const total = bank.topics.length;
  const remaining = bank.topics.filter((t) => !t.used).length;
  const used = total - remaining;

  return NextResponse.json({ exists: true, total, used, remaining });
}
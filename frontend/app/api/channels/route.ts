import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

interface Channel {
  id: string;
  name: string;
  niche: string;
  category: string;
  youtubeAccount: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'channels.json');

async function readChannels(): Promise<Channel[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.channels) ? parsed.channels : [];
  } catch {
    return [];
  }
}

async function writeChannels(channels: Channel[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify({ channels }, null, 2), 'utf-8');
}

export async function GET() {
  const channels = await readChannels();
  return NextResponse.json({ channels });
}

export async function POST(req: NextRequest) {
  try {
    const { name, niche, category, youtubeAccount } = await req.json();
    if (!name || !name.trim() || !niche || !niche.trim()) {
      return NextResponse.json({ error: 'Channel name and niche are required' }, { status: 400 });
    }

    const channels = await readChannels();
    const newChannel: Channel = {
      id: randomUUID(),
      name: name.trim(),
      niche: niche.trim(),
      category: category || 'storytelling',
      // Which authorized YouTube account/token this channel publishes
      // to (see youtube_upload.py --account). Defaults to "default"
      // so existing setups (the original single-account token) keep
      // working without needing this field set.
      youtubeAccount: (youtubeAccount || 'default').trim(),
      createdAt: new Date().toISOString(),
    };
    channels.push(newChannel);
    await writeChannels(channels);

    return NextResponse.json({ channel: newChannel });
  } catch (err) {
    console.error('channels POST error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Channel id is required' }, { status: 400 });
    }

    const channels = await readChannels();
    const filtered = channels.filter((c) => c.id !== id);
    await writeChannels(filtered);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error('channels DELETE error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
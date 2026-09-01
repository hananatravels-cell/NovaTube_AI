import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "scheduled-posts.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

function readSchedule(): any[] {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeSchedule(items: any[]) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function GET() {
  const items = readSchedule();
  // Don't send the huge video_base64 back in the list view — just metadata
  const lightweight = items.map(({ video_base64, thumbnail_base64, ...rest }) => rest);
  return NextResponse.json({ items: lightweight });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      video_base64,
      thumbnail_base64,
      title,
      description,
      tags,
      scheduledAt,
      type, // "long" or "short"
    } = body;

    if (!video_base64 || !scheduledAt) {
      return NextResponse.json(
        { error: "video_base64 aur scheduledAt zaroori hain" },
        { status: 400 }
      );
    }

    const items = readSchedule();
    const newItem = {
      id: `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      video_base64,
      thumbnail_base64: thumbnail_base64 || null,
      title: title || "Untitled",
      description: description || "",
      tags: tags || [],
      type: type || "long",
      scheduledAt, // ISO string
      status: "pending", // pending | published | failed
      createdAt: new Date().toISOString(),
      publishedAt: null,
      error: null,
    };

    items.push(newItem);
    writeSchedule(items);

    const { video_base64: _v, thumbnail_base64: _t, ...lightweight } = newItem;
    return NextResponse.json({ item: lightweight });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to schedule" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id zaroori hai" }, { status: 400 });
  }
  const items = readSchedule();
  const filtered = items.filter((i) => i.id !== id);
  writeSchedule(filtered);
  return NextResponse.json({ ok: true });
}
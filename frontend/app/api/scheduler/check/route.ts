import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "scheduled-posts.json");

function readSchedule(): any[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeSchedule(items: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function POST() {
  const items = readSchedule();
  const now = new Date();
  const dueItems = items.filter(
    (i) => i.status === "pending" && new Date(i.scheduledAt) <= now
  );

  const results: any[] = [];

  for (const item of dueItems) {
    try {
      const publishRes = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/agent/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoBase64: item.video_base64,
            thumbnailBase64: item.thumbnail_base64 || undefined,
            title: item.title,
            description: item.description,
            tags: item.tags,
          }),
        }
      );

      const publishData = await publishRes.json();

      if (publishRes.ok) {
        item.status = "published";
        item.publishedAt = new Date().toISOString();
        item.videoUrl = publishData.videoUrl || `https://youtube.com/watch?v=${publishData.videoId}`;
        item.error = null;
      } else {
        item.status = "failed";
        item.error = publishData.error || "Publish failed";
      }
    } catch (e: any) {
      item.status = "failed";
      item.error = e?.message || "Unknown error";
    }

    results.push({ id: item.id, status: item.status });
  }

  if (dueItems.length > 0) {
    writeSchedule(items);
  }

  return NextResponse.json({ checked: items.length, published: results });
}
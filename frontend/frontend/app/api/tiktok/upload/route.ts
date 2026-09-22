import { NextRequest, NextResponse } from "next/server";
import { getTikTokAccessToken } from "../../../../lib/tiktokTokens";

export const runtime = "nodejs";

const API = "https://open.tiktokapis.com/v2";
const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || "http://127.0.0.1:8002";

export async function POST(req: NextRequest) {
  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  const token = await getTikTokAccessToken();
  if (!token) return NextResponse.json({ error: "TikTok not connected" }, { status: 401 });

  const vRes = await fetch(`${VIDEO_SERVICE_URL}/video-file/${encodeURIComponent(jobId)}`);
  if (!vRes.ok) return NextResponse.json({ error: "Video fetch failed" }, { status: 502 });
  const buf = Buffer.from(await vRes.arrayBuffer());
  const size = buf.length;

  if (size === 0) {
    return NextResponse.json({ error: "Video file is empty" }, { status: 502 });
  }
  const MAX_SINGLE_CHUNK = 64 * 1024 * 1024;
  let chunkSize: number;
  let total: number;
  if (size <= MAX_SINGLE_CHUNK) {
    chunkSize = size;
    total = 1;
  } else {
    chunkSize = 10 * 1024 * 1024;
    total = Math.ceil(size / chunkSize);
  }

  const initRes = await fetch(`${API}/post/publish/inbox/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      source_info: {
        source: "FILE_UPLOAD",
        video_size: size,
        chunk_size: chunkSize,
        total_chunk_count: total,
      },
    }),
  });

  let init: any;
  try {
    init = await initRes.json();
  } catch {
    return NextResponse.json({ error: "TikTok init returned invalid response" }, { status: 502 });
  }
  if (init.error?.code && init.error.code !== "ok") {
    return NextResponse.json({ error: init.error }, { status: 400 });
  }
  const { publish_id, upload_url } = init.data || {};
  if (!upload_url) {
    return NextResponse.json({ error: "No upload_url returned by TikTok" }, { status: 502 });
  }

  for (let i = 0; i < total; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, size) - 1;
    const part = buf.subarray(start, end + 1);

    const up = await fetch(upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": "video/mp4",
        "Content-Range": `bytes ${start}-${end}/${size}`,
      },
      body: new Uint8Array(part),
    });

    if (!up.ok && up.status !== 206) {
      const text = await up.text().catch(() => "");
      return NextResponse.json(
        { error: `Chunk ${i} failed`, status: up.status, detail: text.slice(0, 300) },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ publish_id });
}
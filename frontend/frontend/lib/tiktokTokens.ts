import fs from "fs";
import path from "path";

type Stored = { access_token: string; refresh_token: string; expires_at: number };

const FILE = path.join(process.cwd(), ".tiktok-tokens.json");

export async function loadTokens(): Promise<Stored | null> {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return null;
  }
}

export async function saveTokens(t: Stored) {
  fs.writeFileSync(FILE, JSON.stringify(t));
}

export async function getTikTokAccessToken(): Promise<string | null> {
  const t = await loadTokens();
  if (!t) return null;
  if (Date.now() < t.expires_at - 60_000) return t.access_token;

  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: t.refresh_token,
    }),
  });
  const d = await r.json();
  if (!d.access_token) return null;

  await saveTokens({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: Date.now() + d.expires_in * 1000,
  });
  return d.access_token;
}
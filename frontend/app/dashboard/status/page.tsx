import { NextResponse } from 'next/server';

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
  link: string;
};

async function checkPexels(): Promise<CheckResult> {
  const link = 'https://www.pexels.com/api/new/';
  const key = process.env.PEXELS_API_KEY;
  if (!key) return { name: 'Pexels', ok: false, detail: 'Key missing', link };
  try {
    const res = await fetch('https://api.pexels.com/v1/search?query=test&per_page=1', {
      headers: { Authorization: key },
    });
    return { name: 'Pexels', ok: res.ok, detail: res.ok ? 'Working' : `HTTP ${res.status}`, link };
  } catch (e: any) {
    return { name: 'Pexels', ok: false, detail: e.message, link };
  }
}

async function checkPixabay(): Promise<CheckResult> {
  const link = 'https://pixabay.com/api/docs/';
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return { name: 'Pixabay', ok: false, detail: 'Key missing', link };
  try {
    const res = await fetch(`https://pixabay.com/api/?key=${key}&q=test&per_page=3`);
    const data = await res.json();
    const ok = res.ok && !data.error;
    return { name: 'Pixabay', ok, detail: ok ? 'Working' : (data.error || `HTTP ${res.status}`), link };
  } catch (e: any) {
    return { name: 'Pixabay', ok: false, detail: e.message, link };
  }
}

async function checkGroq(): Promise<CheckResult> {
  const link = 'https://console.groq.com/keys';
  const key = process.env.GROQ_API_KEY;
  if (!key) return { name: 'Groq', ok: false, detail: 'Key missing', link };
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    return { name: 'Groq', ok: res.ok, detail: res.ok ? 'Working' : `HTTP ${res.status}`, link };
  } catch (e: any) {
    return { name: 'Groq', ok: false, detail: e.message, link };
  }
}

async function checkElevenLabs(): Promise<CheckResult> {
  const link = 'https://elevenlabs.io/app/settings/api-keys';
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return { name: 'ElevenLabs', ok: false, detail: 'Key missing', link };
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': key },
    });
    return { name: 'ElevenLabs', ok: res.ok, detail: res.ok ? 'Working' : `HTTP ${res.status}`, link };
  } catch (e: any) {
    return { name: 'ElevenLabs', ok: false, detail: e.message, link };
  }
}

async function checkOpenRouter(): Promise<CheckResult> {
  const link = 'https://openrouter.ai/keys';
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return { name: 'OpenRouter', ok: false, detail: 'Key missing', link };
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${key}` },
    });
    return { name: 'OpenRouter', ok: res.ok, detail: res.ok ? 'Working' : `HTTP ${res.status}`, link };
  } catch (e: any) {
    return { name: 'OpenRouter', ok: false, detail: e.message, link };
  }
}

async function checkJamendo(): Promise<CheckResult> {
  const link = 'https://devportal.jamendo.com/';
  const id = process.env.JAMENDO_CLIENT_ID;
  if (!id) return { name: 'Jamendo', ok: false, detail: 'Client ID missing', link };
  try {
    const res = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${id}&limit=1`);
    const data = await res.json();
    const ok = res.ok && data.headers?.status === 'success';
    return { name: 'Jamendo', ok, detail: ok ? 'Working' : (data.headers?.error_message || `HTTP ${res.status}`), link };
  } catch (e: any) {
    return { name: 'Jamendo', ok: false, detail: e.message, link };
  }
}

function checkGoogle(): CheckResult {
  const link = 'https://console.cloud.google.com/apis/credentials';
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  const ok = Boolean(id && secret);
  return { name: 'Google OAuth', ok, detail: ok ? 'Configured' : 'Missing ID or Secret', link };
}

async function checkSubService(name: string, envVar: string, link: string): Promise<CheckResult> {
  const url = process.env[envVar];
  if (!url) return { name, ok: false, detail: `${envVar} not set`, link };
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(40000) });
    const ok = res.ok;
    return { name, ok, detail: ok ? 'Live' : `HTTP ${res.status}`, link: url };
  } catch (e: any) {
    return { name, ok: false, detail: e.message?.includes('abort') ? 'Timed out (may be waking up)' : e.message, link: url };
  }
}

export async function GET() {
  const results = await Promise.all([
    checkSubService('TTS Service', 'TTS_SERVICE_URL', 'https://dashboard.render.com'),
    checkSubService('Video Service', 'VIDEO_SERVICE_URL', 'https://dashboard.render.com'),
    checkPexels(),
    checkPixabay(),
    checkGroq(),
    checkElevenLabs(),
    checkOpenRouter(),
    checkJamendo(),
    Promise.resolve(checkGoogle()),
  ]);

  return NextResponse.json({ checkedAt: new Date().toISOString(), results });
}

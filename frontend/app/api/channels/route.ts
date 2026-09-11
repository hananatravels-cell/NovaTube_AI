import { NextRequest, NextResponse } from 'next/server';

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || "http://localhost:8002";

export async function GET() {
  try {
    const res = await fetch(`${VIDEO_SERVICE_URL}/channels`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('channels GET error:', err);
    return NextResponse.json({ channels: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${VIDEO_SERVICE_URL}/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.detail || 'Something went wrong' }, { status: res.status });
    }
    return NextResponse.json(data);
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
    const res = await fetch(`${VIDEO_SERVICE_URL}/channels/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('channels DELETE error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
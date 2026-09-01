// app/api/generate-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { videoService } from '@/app/services/videoGenerator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, style, ratio, duration, quality } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
    }

    const result = await videoService.createJob({
      prompt: prompt.trim(), style: style || 'cinematic', ratio: ratio || '16:9', duration: duration || '10', quality: quality || 'hd',
    });

    return NextResponse.json({ success: true, status: 'processing', jobId: result.jobId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
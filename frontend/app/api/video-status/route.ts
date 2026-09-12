// app/api/video-status/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    console.log('🔍 Checking status for job:', jobId);

    // Demo: 15 second baad complete
    const jobCreatedTime = parseInt(jobId.split('_')[1]);
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - jobCreatedTime) / 1000;

    if (elapsedSeconds < 15) {
      return NextResponse.json({
        success: true,
        status: 'processing',
        jobId: jobId,
        progress: Math.min(Math.floor((elapsedSeconds / 15) * 100), 90),
      });
    } else {
      return NextResponse.json({
        success: true,
        status: 'completed',
        jobId: jobId,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
        downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        progress: 100,
      });
    }a
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
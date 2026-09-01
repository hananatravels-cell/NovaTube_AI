// app/services/videoGenerator.ts
interface VideoJob {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  prompt: string;
  style: string;
  ratio: string;
  duration: string;
  quality: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: number;
}

const jobStore: Map<string, VideoJob> = new Map();

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of jobStore.entries()) {
    if (job.createdAt < cutoff) jobStore.delete(id);
  }
}, 10 * 60 * 1000);

export class VideoGeneratorService {
  async createJob(params: { prompt: string; style: string; ratio: string; duration: string; quality: string; }): Promise<{ jobId: string; status: string }> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: VideoJob = { id: jobId, status: 'processing', ...params, createdAt: Date.now() };
    jobStore.set(jobId, job);
    this.processJob(jobId).catch((err) => {
      const j = jobStore.get(jobId);
      if (j) { j.status = 'failed'; j.error = err.message; }
    });
    return { jobId, status: 'processing' };
  }

  getJobStatus(jobId: string): VideoJob | null {
    return jobStore.get(jobId) || null;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = jobStore.get(jobId);
    if (!job) return;
    try {
      // Real AI API yahan call hogi (Replicate, Runway, etc.)
      // Filhal 15 second ka demo wait time hai
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      job.videoUrl = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      job.thumbnailUrl = "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg";
      job.downloadUrl = job.videoUrl;
      job.status = 'completed';
    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
    }
  }
}

export const videoService = new VideoGeneratorService();
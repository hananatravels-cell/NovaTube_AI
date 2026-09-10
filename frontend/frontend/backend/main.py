from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.video_generator import video_service

app = FastAPI(title="NovaTube AI Video Generation Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    prompt: str
    style: str
    ratio: str
    duration: str
    quality: str

@app.post("/generate-video")
async def generate_video(payload: VideoRequest):
    job_id = await video_service.create_generation_job(
        prompt=payload.prompt,
        style=payload.style,
        ratio=payload.ratio,
        duration=payload.duration,
        quality=payload.quality
    )
    return {
        "success": True,
        "status": "processing",
        "jobId": job_id
    }

@app.get("/video-status/{job_id}")
async def get_video_status(job_id: str):
    job_status = await video_service.get_job_status(job_id)
    return job_status
"""
NovaTube AI - YouTube Publish Service
Wraps youtube_upload.py behind a small FastAPI endpoint so the dashboard
(which holds the finished video as base64 in the browser) can publish
directly to YouTube — to any authorized channel, selected by account
label (see youtube_upload.py for how accounts/tokens work), either
immediately or scheduled for a future publish time.

Run with: uvicorn youtube_service:app --port 8003
"""
import base64
import logging
import os
import tempfile

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from youtube_upload import upload_video, upload_thumbnail

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("novatube-youtube")

app = FastAPI(title="NovaTube AI - YouTube Publish Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PublishRequest(BaseModel):
    video_base64: str
    thumbnail_base64: str | None = None
    title: str
    description: str = ""
    tags: list[str] = []
    privacy: str = "public"
    account: str = "default"  # which authorized channel to publish to
    publish_at: str | None = None  # ISO 8601 UTC — schedule instead of publishing immediately


def _decode_data_url(data_url: str) -> bytes:
    if data_url.startswith("data:"):
        data_url = data_url.split(",", 1)[1]
    return base64.b64decode(data_url)


@app.post("/upload")
async def publish(req: PublishRequest):
    work_dir = tempfile.mkdtemp(prefix="novatube_publish_")
    try:
        video_path = os.path.join(work_dir, "video.mp4")
        with open(video_path, "wb") as f:
            f.write(_decode_data_url(req.video_base64))

        if req.publish_at:
            logger.info(f"Uploading '{req.title}' to YouTube (account: {req.account}), scheduled for {req.publish_at}...")
        else:
            logger.info(f"Uploading '{req.title}' to YouTube (account: {req.account})...")

        result = upload_video(
            file_path=video_path,
            title=req.title[:100],
            description=req.description,
            tags=req.tags,
            privacy_status=req.privacy,
            publish_at=req.publish_at,
            account=req.account,
        )
        video_id = result["id"]

        if req.thumbnail_base64:
            try:
                thumb_path = os.path.join(work_dir, "thumb.jpg")
                with open(thumb_path, "wb") as f:
                    f.write(_decode_data_url(req.thumbnail_base64))
                upload_thumbnail(video_id, thumb_path, account=req.account)
            except Exception as e:
                logger.warning(f"Thumbnail upload failed (video still published): {e}")

        return {
            "video_id": video_id,
            "video_url": f"https://www.youtube.com/watch?v={video_id}",
        }
    except Exception as e:
        logger.error(f"Publish failed (account: {req.account}): {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        import shutil
        shutil.rmtree(work_dir, ignore_errors=True)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "NovaTube AI YouTube Publish"}
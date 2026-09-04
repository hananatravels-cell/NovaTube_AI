"""
NovaTube AI - Video Generation Service
Takes a script (broken into scenes) + a category + narration audio,
fetches matching stock video clips from Pexels (Pixabay as fallback),
automatically fetches category-matched background music from Jamendo
(cached locally after first fetch), mixes it in quietly under the
narration, and assembles everything into a finished video.

Run with: uvicorn video_service:app --host 0.0.0.0 --port 8002 --reload
"""
from dotenv import load_dotenv
load_dotenv()
import base64
import json
import logging
import os
import re
import shutil
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import time as _time
import uuid
import proglog

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    CompositeAudioClip,
    ImageClip,
    CompositeVideoClip,
    concatenate_videoclips,
    concatenate_audioclips,
)
from PIL import Image, ImageDraw, ImageFont

# Newer Pillow versions (10+) removed Image.ANTIALIAS in favor of
# Image.LANCZOS. moviepy's resize code still references ANTIALIAS, so
# without this shim every clip fails to resize with:
#   "module 'PIL.Image' has no attribute 'ANTIALIAS'"
# Restoring the old name (pointing at the modern equivalent) fixes this
# regardless of which Pillow version ends up installed.
if not hasattr(Image, "ANTIALIAS"):
    Image.ANTIALIAS = Image.LANCZOS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("novatube-video")

app = FastAPI(title="NovaTube AI - Video Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def safe_close(*clips):
    """Safely close moviepy clips (and their underlying ffmpeg reader
    subprocesses), ignoring any errors during cleanup. Call this on
    EVERY VideoFileClip / AudioFileClip / composite clip once you're
    done with it — otherwise the ffmpeg subprocess it opened stays
    alive in the background even after the request finishes."""
    for clip in clips:
        try:
            if clip is not None and hasattr(clip, "close"):
                clip.close()
        except Exception:
            pass

class JobProgressLogger(proglog.ProgressBarLogger):
    """Feeds moviepy's internal encoding progress back into our job
    tracker, throttled to once every few seconds — this is what keeps
    a long write_videofile() call from looking "stalled" to the
    STALL_SECONDS watchdog, since it otherwise runs silently for
    minutes with no progress update in between."""

    def __init__(self, job_id: str, stage_label: str):
        super().__init__()
        self.job_id = job_id
        self.stage_label = stage_label
        self._last_update = 0.0

    def bars_callback(self, bar, attr, value, old_value=None):
        now = _time.time()
        if now - self._last_update < 5:
            return
        self._last_update = now
        total = self.bars.get(bar, {}).get("total")
        if total:
            pct = int(100 * value / max(total, 1))
            _job_update(self.job_id, stage=f"{self.stage_label} ({pct}%)")
        else:
            _job_update(self.job_id, stage=self.stage_label)

# In-memory job tracker. Each render gets a job_id; a background
# thread does the actual work while /video-status/{job_id} reports
# live progress. A job is considered "stalled" (and auto-failed) if
# it goes STALL_SECONDS without any progress update — this replaces
# a fixed total-time timeout with one based on actual activity.
JOBS: dict[str, dict] = {}
JOBS_LOCK = threading.Lock()
STALL_SECONDS = 600  # 10 minutes with zero progress = treat as hung


def _job_update(job_id: str, **fields):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if job is None:
            return
        job.update(fields)
        job["last_update"] = _time.time()


def _job_init(job_id: str, scenes_total: int):
    with JOBS_LOCK:
        JOBS[job_id] = {
            "status": "running",       # running | done | failed
            "stage": "starting",
            "scenes_total": scenes_total,
            "scenes_done": 0,
            "error": None,
            "video_base64": None,
            "duration": None,
            "music_used": False,
            "last_update": _time.time(),
        }


PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
PIXABAY_API_KEY = os.getenv("PIXABAY_API_KEY")
JAMENDO_CLIENT_ID = os.getenv("JAMENDO_CLIENT_ID")

MUSIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "novatube_music_cache")
MUSIC_VOLUME = 0.15

CATEGORY_KEYWORDS = {
    "islamic": "mosque quran islamic peaceful spiritual calligraphy prayer",
    "motivation": "success achievement sunrise mountain climb inspiring",
    "storytelling": "cinematic emotional dramatic scene narrative",
    "tech": "technology computer futuristic digital innovation",
    "fitness": "gym workout exercise fitness training athlete",
    "travel": "travel adventure landscape scenic destination journey",
    "history": "old vintage historical monument archive ancient",
    "current_affairs": "city news business modern people urban",
    "cooking": "food cooking kitchen recipe chef delicious",
    "deep_sleep": "calm night sky slow nature relaxing peaceful",
    "finance": "money business investing stock market office finance",
    "gaming": "gaming controller neon esports screen digital",
    "comedy": "funny people laughing bright colorful lighthearted",
    "beauty": "makeup skincare beauty cosmetics glamour",
    "fashion": "fashion model clothing runway style trendy",
    "education": "classroom books learning study university student",
    "nature": "wildlife forest animals nature scenic outdoor",
    "horror": "dark mysterious eerie fog shadow suspense",
    "parenting": "family children home warm cozy parenting",
    "automotive": "car vehicle road driving automotive speed",
}

MUSIC_SEARCH_TAGS = {
    "islamic": ["meditative", "relaxing", "calm"],
    "motivation": ["motivational", "uplifting", "inspiring"],
    "storytelling": ["cinematic", "dramatic", "emotional"],
    "tech": ["electronic", "corporate", "chill"],
    "fitness": ["energetic", "sport", "upbeat"],
    "travel": ["acoustic", "happy", "summer"],
    "history": ["cinematic", "dramatic", "epic"],
    "current_affairs": ["corporate", "background", "positive"],
    "cooking": ["happy", "acoustic", "fun"],
    "deep_sleep": ["ambient", "relaxing", "soft"],
    "finance": ["corporate", "background", "positive"],
    "gaming": ["electronic", "energetic", "epic"],
    "comedy": ["happy", "fun", "funny"],
    "beauty": ["soft", "romantic", "dreamy"],
    "fashion": ["electronic", "groovy", "retro"],
    "education": ["corporate", "calm", "background"],
    "nature": ["ambient", "relaxing", "soundscape"],
    "horror": ["dark", "suspense", "dramatic"],
    "parenting": ["happy", "soft", "tender"],
    "automotive": ["energetic", "upbeat", "heavy"],
}

STOP_WORDS = {
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to",
    "of", "and", "or", "but", "for", "with", "this", "that", "these",
    "those", "it", "its", "as", "by", "from", "be", "been", "being",
    "you", "your", "we", "our", "they", "their", "he", "she", "his",
    "her", "them", "i", "my", "me", "so", "if", "not", "no", "do",
    "does", "did", "has", "have", "had", "will", "would", "can",
    "could", "should", "may", "might", "just", "very", "also",
    "there", "here", "what", "when", "where", "who", "how", "which",
}


class VideoRequest(BaseModel):
    scenes: list[str]
    category: str = "storytelling"
    audio_base64: str
    orientation: str = "vertical"
    want_music: bool = True
    title: str = ""
    intro_audio_base64: str | None = None
    intro_text: str = ""


def clean_query(scene_text: str, category: str, title: str = "") -> str:
    words = re.findall(r"[A-Za-z]+", scene_text.lower())
    meaningful = [w for w in words if w not in STOP_WORDS and len(w) > 2]

    title_words = [w.lower() for w in re.findall(r"[A-Za-z]+", title) if w.lower() not in STOP_WORDS and len(w) > 2]
    combined = title_words + [w for w in meaningful if w not in title_words]
    base = " ".join(combined[:6]) if combined else "background"
    flavor = CATEGORY_KEYWORDS.get(category, CATEGORY_KEYWORDS["storytelling"])
    return f"{base} {flavor}".strip()


def _jamendo_search_single_tag(tag: str) -> str | None:
    try:
        resp = requests.get(
            "https://api.jamendo.com/v3.0/tracks/",
            params={
                "client_id": JAMENDO_CLIENT_ID,
                "format": "json",
                "limit": 1,
                "tags": tag,
                "vocalinstrumental": "instrumental",
                "order": "popularity_total",
                "audioformat": "mp32",
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"Jamendo search failed for tag '{tag}' ({resp.status_code}): {resp.text[:200]}")
            return None
        data = resp.json()
        results = data.get("results", [])
        if not results:
            logger.info(f"Jamendo returned 0 results for tag '{tag}'")
            return None
        return results[0].get("audio")
    except Exception as e:
        logger.warning(f"Jamendo error for tag '{tag}': {e}")
        return None


def search_jamendo_music(category: str) -> str | None:
    if not JAMENDO_CLIENT_ID:
        return None
    tags = MUSIC_SEARCH_TAGS.get(category, MUSIC_SEARCH_TAGS["storytelling"])
    for tag in tags:
        audio_url = _jamendo_search_single_tag(tag)
        if audio_url:
            logger.info(f"Jamendo match for category '{category}' using tag '{tag}'")
            return audio_url
    return None


def get_or_fetch_music(category: str) -> str | None:
    os.makedirs(MUSIC_DIR, exist_ok=True)
    cache_path = os.path.join(MUSIC_DIR, f"{category}.mp3")

    if os.path.isfile(cache_path):
        return cache_path

    music_url = search_jamendo_music(category)

    if not music_url and category != "storytelling":
        fallback_cache = os.path.join(MUSIC_DIR, "storytelling.mp3")
        if os.path.isfile(fallback_cache):
            return fallback_cache
        music_url = search_jamendo_music("storytelling")
        cache_path = fallback_cache

    if not music_url:
        return None

    if download_clip(music_url, cache_path):
        logger.info(f"Fetched and cached new music track for '{category}'")
        return cache_path

    return None


def prepare_music_clip(music_path: str, target_duration: float):
    music = AudioFileClip(music_path)

    if music.duration < target_duration:
        loops_needed = int(target_duration // music.duration) + 1
        music = concatenate_audioclips([music] * loops_needed)
        # NOTE: do NOT close the original `music` clip here —
        # concatenate_audioclips re-references the same underlying
        # reader rather than copying it, so closing it early breaks
        # playback during the final render. It gets closed once,
        # safely, via open_clips in the render job's cleanup.

    trimmed = music.subclip(0, target_duration)
    trimmed = trimmed.volumex(MUSIC_VOLUME)
    return trimmed


def search_pexels_video(query: str, orientation: str):
    if not PEXELS_API_KEY:
        return None
    try:
        resp = requests.get(
            "https://api.pexels.com/videos/search",
            headers={"Authorization": PEXELS_API_KEY},
            params={
                "query": query,
                "per_page": 1,
                "orientation": "portrait" if orientation == "vertical" else "landscape",
            },
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"Pexels search failed ({resp.status_code}): {resp.text[:200]}")
            return None
        data = resp.json()
        videos = data.get("videos", [])
        if not videos:
            return None
        files = sorted(videos[0]["video_files"], key=lambda f: f.get("width", 0))
        for f in files:
            if 480 <= f.get("width", 0) <= 1280:
                return f["link"]
        return files[0]["link"] if files else None
    except Exception as e:
        logger.warning(f"Pexels error: {e}")
        return None


def search_pixabay_video(query: str):
    if not PIXABAY_API_KEY:
        return None
    try:
        resp = requests.get(
            "https://pixabay.com/api/videos/",
            params={"key": PIXABAY_API_KEY, "q": query, "per_page": 3},
            timeout=15,
        )
        if resp.status_code != 200:
            logger.warning(f"Pixabay search failed ({resp.status_code}): {resp.text[:200]}")
            return None
        data = resp.json()
        hits = data.get("hits", [])
        if not hits:
            return None
        return hits[0]["videos"]["medium"]["url"]
    except Exception as e:
        logger.warning(f"Pixabay error: {e}")
        return None


def create_intro_text_image(text: str, width: int, height: int):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    banner_h = int(height * 0.22)
    banner_y = int((height - banner_h) / 2)
    draw.rectangle([0, banner_y, width, banner_y + banner_h], fill=(0, 0, 0, 140))

    font_size = int(width * 0.06)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\arial.ttf", font_size)
    except Exception as e:
        logger.warning(f"Font load failed, using default: {e}")
        font = ImageFont.load_default()

    max_text_width = width * 0.85
    words = text.split()
    lines = []
    current = ""
    for w in words:
        test = (current + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] > max_text_width and current:
            lines.append(current)
            current = w
        else:
            current = test
    if current:
        lines.append(current)
    lines = lines[:3]

    line_height = font_size + 10
    total_h = line_height * len(lines)
    start_y = banner_y + (banner_h - total_h) / 2

    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        line_w = bbox[2] - bbox[0]
        x = (width - line_w) / 2
        y = start_y + i * line_height
        draw.text((x, y), line, font=font, fill=(255, 255, 255, 255))

    return img


def build_intro_clip(intro_audio_path: str, category: str, orientation: str, intro_text: str):
    target_w, target_h = (1080, 1920) if orientation == "vertical" else (1920, 1080)

    intro_audio = AudioFileClip(intro_audio_path)
    intro_duration = intro_audio.duration

    query = f"{CATEGORY_KEYWORDS.get(category, CATEGORY_KEYWORDS['storytelling'])} intro opening"
    video_url = search_pexels_video(query, orientation) or search_pixabay_video(query)
    if not video_url:
        safe_close(intro_audio)
        raise HTTPException(status_code=500, detail="Could not fetch an intro background clip")

    tmp_dir = tempfile.mkdtemp(prefix="novatube_intro_")
    bg_path = os.path.join(tmp_dir, "intro_bg.mp4")
    if not download_clip(video_url, bg_path):
        safe_close(intro_audio)
        raise HTTPException(status_code=500, detail="Failed to download intro background clip")

    raw_bg_clip = VideoFileClip(bg_path)
    if raw_bg_clip.duration < intro_duration:
        loops = int(intro_duration // raw_bg_clip.duration) + 1
        looped_bg = concatenate_videoclips([raw_bg_clip] * loops)
        bg_clip = looped_bg.subclip(0, intro_duration)
    else:
        bg_clip = raw_bg_clip.subclip(0, intro_duration)

    bg_clip = bg_clip.resize(height=target_h) if bg_clip.h < bg_clip.w else bg_clip.resize(width=target_w)
    bg_clip = bg_clip.crop(
        x_center=bg_clip.w / 2, y_center=bg_clip.h / 2, width=target_w, height=target_h
    )

    intro_composite = bg_clip.set_audio(intro_audio)
    # NOTE: intro_audio and bg_clip's underlying reader are now referenced
    # by intro_composite (and, downstream, by final_video) — they must
    # stay open until final_video.write_videofile() has run and
    # final_video itself is closed. Do not close them here.
    return intro_composite


def download_clip(url: str, dest_path: str) -> bool:
    try:
        with requests.get(url, stream=True, timeout=30) as r:
            r.raise_for_status()
            with open(dest_path, "wb") as f:
                for chunk in r.iter_content(chunk_size=1024 * 256):
                    f.write(chunk)
        return True
    except Exception as e:
        logger.warning(f"Download failed: {e}")
        return False


@app.post("/generate-video")
async def generate_video(req: VideoRequest):
    """Kicks off rendering in a background thread and returns immediately
    with a job_id. Poll GET /video-status/{job_id} for progress and the
    final result — this replaces waiting on one long HTTP request, so a
    slow-but-healthy render is never killed by a fixed client timeout."""
    if not req.scenes:
        raise HTTPException(status_code=400, detail="At least one scene is required")

    job_id = uuid.uuid4().hex
    _job_init(job_id, scenes_total=len(req.scenes))

    thread = threading.Thread(target=_run_generate_video, args=(job_id, req), daemon=True)
    thread.start()

    return {"job_id": job_id}


@app.get("/video-status/{job_id}")
async def video_status(job_id: str):
    with JOBS_LOCK:
        job = JOBS.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Unknown job_id")
        job = dict(job)  # shallow copy for the response

    # Stall detection: if a "running" job hasn't reported any progress
    # in STALL_SECONDS, treat it as hung and fail it — this replaces a
    # fixed total-time timeout with one based on actual inactivity.
    stalled = (
        job["status"] == "running"
        and (_time.time() - job["last_update"]) > STALL_SECONDS
    )
    if stalled:
        _job_update(job_id, status="failed", error=f"Rendering stalled — no progress for {STALL_SECONDS}s")
        job["status"] = "failed"
        job["error"] = f"Rendering stalled — no progress for {STALL_SECONDS}s"

    # Don't ship the full base64 video on every poll — only once, when done.
    response = {k: v for k, v in job.items() if k != "video_base64"}
    if job["status"] == "done":
        response["video"] = f"data:video/mp4;base64,{job['video_base64']}"
    return response


def _run_generate_video(job_id: str, req: VideoRequest):
    work_dir = tempfile.mkdtemp(prefix="novatube_")
    clip_paths = []
    music_used = False
    open_clips = []
    narration = None
    final_video = None

    try:
        _job_update(job_id, stage="preparing_audio")
        audio_data = req.audio_base64
        if audio_data.startswith("data:"):
            audio_data = audio_data.split(",", 1)[1]
        audio_bytes = base64.b64decode(audio_data)
        audio_path = os.path.join(work_dir, "narration.mp3")
        with open(audio_path, "wb") as f:
            f.write(audio_bytes)
        narration = AudioFileClip(audio_path)
        open_clips.append(narration)
        total_duration = narration.duration
        per_scene = total_duration / max(len(req.scenes), 1)

        _job_update(job_id, stage="downloading_clips")

        # Per-scene timing instrumentation. This logs search time and
        # download time separately for every scene, plus how many
        # scenes fell back to Pixabay, so the exact bottleneck (slow
        # search API, slow/large downloads, too few concurrent
        # workers, etc.) can be identified from the terminal output
        # before any further optimization is attempted.
        fetch_timings: dict[int, dict] = {}
        pixabay_fallback_count = 0
        query_seen_count: dict[str, int] = {}

        def _fetch_one_scene(i: int, scene_text: str):
            scene_start = _time.time()
            try:
                query = clean_query(scene_text, req.category, req.title)

                search_start = _time.time()
                video_url = search_pexels_video(query, req.orientation)
                source = "pexels"
                used_pixabay = False

                if not video_url:
                    video_url = search_pixabay_video(query)
                    source = "pixabay"
                    used_pixabay = True
                search_elapsed = _time.time() - search_start

                if not video_url:
                    total_elapsed = _time.time() - scene_start
                    logger.info(
                        f"Scene {i} timing — search: {search_elapsed:.1f}s, "
                        f"download: 0.0s, total: {total_elapsed:.1f}s "
                        f"(NO CLIP FOUND, query: '{query}')"
                    )
                    fetch_timings[i] = {
                        "search": search_elapsed, "download": 0.0,
                        "total": total_elapsed, "used_pixabay": used_pixabay,
                        "query": query, "found": False,
                    }
                    return i, None

                clip_path = os.path.join(work_dir, f"clip_{i}.mp4")
                download_start = _time.time()
                download_ok = download_clip(video_url, clip_path)
                download_elapsed = _time.time() - download_start

                file_size_mb = 0.0
                if download_ok and os.path.isfile(clip_path):
                    file_size_mb = os.path.getsize(clip_path) / (1024 * 1024)

                total_elapsed = _time.time() - scene_start
                fetch_timings[i] = {
                    "search": search_elapsed, "download": download_elapsed,
                    "total": total_elapsed, "used_pixabay": used_pixabay,
                    "query": query, "found": download_ok, "size_mb": file_size_mb,
                }

                if download_ok:
                    logger.info(
                        f"Scene {i} timing — search: {search_elapsed:.1f}s, "
                        f"download: {download_elapsed:.1f}s ({file_size_mb:.1f}MB), "
                        f"total: {total_elapsed:.1f}s (source: {source}, query: '{query}')"
                    )
                    return i, (clip_path, source)

                logger.warning(f"Scene {i}: download failed after search, skipping")
                return i, None
            except Exception as e:
                logger.warning(f"Scene {i} fetch failed, skipping: {e}")
                return i, None

        results: dict[int, tuple[str, str] | None] = {}
        done_count = 0
        MAX_CONCURRENT_SCENES = 4

        fetch_stage_start = _time.time()
        with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_SCENES) as pool:
            futures = {
                pool.submit(_fetch_one_scene, i, scene_text): i
                for i, scene_text in enumerate(req.scenes)
            }
            for future in as_completed(futures):
                i, result = future.result()
                results[i] = result
                done_count += 1
                _job_update(job_id, scenes_done=done_count)
        fetch_stage_wall_time = _time.time() - fetch_stage_start

        for i in range(len(req.scenes)):
            if results.get(i):
                clip_paths.append(results[i])

        # Summary log: total scenes, total search/download time SUMMED
        # across all scenes (i.e. what it would have cost sequentially)
        # vs. the actual wall-clock time taken with concurrency — the
        # gap between these two numbers shows how much concurrency is
        # actually helping right now.
        total_scenes = len(req.scenes)
        total_search_time = sum(t["search"] for t in fetch_timings.values())
        total_download_time = sum(t["download"] for t in fetch_timings.values())
        pixabay_fallback_count = sum(1 for t in fetch_timings.values() if t.get("used_pixabay"))
        found_count = sum(1 for t in fetch_timings.values() if t.get("found"))
        logger.info(
            "=== SCENE FETCH SUMMARY ===\n"
            f"Total scenes: {total_scenes}\n"
            f"Scenes with a clip found: {found_count}\n"
            f"Pixabay fallback used: {pixabay_fallback_count}/{total_scenes}\n"
            f"Sum of all search times (sequential-equivalent): {total_search_time:.1f}s\n"
            f"Sum of all download times (sequential-equivalent): {total_download_time:.1f}s\n"
            f"Sum of search+download (sequential-equivalent): {total_search_time + total_download_time:.1f}s\n"
            f"Actual wall-clock time for this fetch stage (with concurrency): {fetch_stage_wall_time:.1f}s\n"
            "==========================="
        )

        if not clip_paths:
            _job_update(job_id, status="failed", error="Could not fetch any video clips from Pexels or Pixabay")
            return

        _job_update(job_id, stage="processing_scenes")
        target_w, target_h = (1080, 1920) if req.orientation == "vertical" else (1920, 1080)
        segments = []
        processing_stage_start = _time.time()
        for clip_path, source in clip_paths:
            clip_process_start = _time.time()
            try:
                vc = VideoFileClip(clip_path)
                open_clips.append(vc)
                # Clamp the requested duration to what the clip actually
                # has — asking moviepy/ffmpeg for frames past the real
                # end of the file is what produced repeated "0 bytes
                # read" warnings and slowed rendering down.
                safe_duration = min(per_scene, vc.duration - 0.05)
                if safe_duration <= 0:
                    logger.warning(f"Clip {clip_path} too short ({vc.duration}s) for a {per_scene}s scene, skipping")
                    continue

                if vc.duration < per_scene:
                    loops = int(per_scene // vc.duration) + 1
                    looped = concatenate_videoclips([vc] * loops)
                    vc = looped.subclip(0, safe_duration)
                else:
                    vc = vc.subclip(0, safe_duration)

                vc = vc.resize(height=target_h) if vc.h < vc.w else vc.resize(width=target_w)
                vc = vc.crop(
                    x_center=vc.w / 2, y_center=vc.h / 2, width=target_w, height=target_h
                )
                segments.append(vc)
                clip_process_elapsed = _time.time() - clip_process_start
                logger.info(f"Processed {os.path.basename(clip_path)} in {clip_process_elapsed:.1f}s")
                _job_update(job_id, stage="processing_scenes")
            except Exception as e:
                logger.warning(f"Skipping unusable clip {clip_path}: {e}")
        processing_stage_elapsed = _time.time() - processing_stage_start
        logger.info(f"=== Total scene PROCESSING time (resize/crop/trim, all scenes): {processing_stage_elapsed:.1f}s ===")

        if not segments:
            _job_update(job_id, status="failed", error="No usable video segments after processing")
            return

        _job_update(job_id, stage="assembling_video")
        final_video = concatenate_videoclips(segments, method="compose")
        narration_trimmed = narration.subclip(0, final_video.duration)

        final_audio = narration_trimmed
        music_clip = None
        if req.want_music:
            _job_update(job_id, stage="mixing_music")
            try:
                music_path = get_or_fetch_music(req.category)
                if music_path:
                    music_clip = prepare_music_clip(music_path, final_video.duration)
                    open_clips.append(music_clip)
                    final_audio = CompositeAudioClip([narration_trimmed, music_clip])
                    music_used = True
                    logger.info(f"Mixed in background music: {os.path.basename(music_path)}")
                else:
                    logger.info(f"No music available for category '{req.category}', skipping music")
            except Exception as e:
                logger.warning(f"Music mixing failed, continuing without music: {e}")

        final_video = final_video.set_audio(final_audio)

        if req.intro_audio_base64:
            _job_update(job_id, stage="building_intro")
            try:
                intro_audio_data = req.intro_audio_base64
                if intro_audio_data.startswith("data:"):
                    intro_audio_data = intro_audio_data.split(",", 1)[1]
                intro_audio_bytes = base64.b64decode(intro_audio_data)
                intro_audio_path = os.path.join(work_dir, "intro_narration.mp3")
                with open(intro_audio_path, "wb") as f:
                    f.write(intro_audio_bytes)

                intro_clip = build_intro_clip(
                    intro_audio_path, req.category, req.orientation, req.intro_text
                )
                open_clips.append(intro_clip)
                final_video = concatenate_videoclips([intro_clip, final_video], method="compose")
                logger.info("Intro clip prepended successfully")
            except Exception as e:
                logger.warning(f"Intro clip failed, continuing without intro: {e}")

        open_clips.append(final_video)

        _job_update(job_id, stage="encoding_final")
        output_path = os.path.join(work_dir, f"final_{uuid.uuid4().hex}.mp4")
        final_video.write_videofile(
            output_path,
            fps=24,
            codec="libx264",
            audio_codec="aac",
            preset="ultrafast",
            threads=4,
            logger=JobProgressLogger(job_id, "encoding_final"),
        )

        with open(output_path, "rb") as f:
            video_b64 = base64.b64encode(f.read()).decode("utf-8")

        _job_update(
            job_id,
            status="done",
            stage="done",
            video_base64=video_b64,
            duration=final_video.duration,
            music_used=music_used,
        )

    except Exception as e:
        logger.error(f"generate_video job {job_id} failed: {e}")
        _job_update(job_id, status="failed", error=str(e))
    finally:
        safe_close(*open_clips)
        try:
            shutil.rmtree(work_dir, ignore_errors=True)
        except Exception:
            pass


INTROS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shorts_intros")
ASPECT_RATIOS = {
    "9:16": (1080, 1920),
    "1:1": (1080, 1080),
    "4:5": (1080, 1350),
    "16:9": (1920, 1080),
}


def reformat_video(input_path: str, output_path: str, target_w: int, target_h: int):
    """Resize + center-crop a video to an exact target aspect ratio."""
    clip = VideoFileClip(input_path)
    try:
        clip = clip.resize(height=target_h) if clip.h / clip.w < target_h / target_w else clip.resize(width=target_w)
        clip = clip.crop(
            x_center=clip.w / 2, y_center=clip.h / 2, width=target_w, height=target_h
        )
        clip.write_videofile(
            output_path, fps=24, codec="libx264", audio_codec="aac",
            preset="ultrafast", threads=2, logger=None,
        )
    finally:
        safe_close(clip)


class ShortRequest(BaseModel):
    video_base64: str
    start_seconds: float = 0
    max_duration: int = 59
    category: str | None = None
    language: str = "Urdu"
    aspect_ratio: str = "9:16"


LANG_CODE = {"Urdu": "ur", "English": "en", "Arabic": "ar"}


@app.post("/make-short")
async def make_short(req: ShortRequest):
    import subprocess
    work_dir = tempfile.mkdtemp(prefix="novatube_short_")
    open_clips = []
    try:
        full_path = os.path.join(work_dir, "full.mp4")
        vdata = req.video_base64
        if vdata.startswith("data:"):
            vdata = vdata.split(",", 1)[1]
        with open(full_path, "wb") as f:
            f.write(base64.b64decode(vdata))

        short_path = os.path.join(work_dir, "short.mp4")
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-ss", str(req.start_seconds),
                "-i", full_path,
                "-t", str(req.max_duration),
                "-c", "copy",
                short_path,
            ],
            check=True, capture_output=True,
        )

        if req.aspect_ratio in ASPECT_RATIOS:
            target_w, target_h = ASPECT_RATIOS[req.aspect_ratio]
            reformatted_path = os.path.join(work_dir, "reformatted.mp4")
            reformat_video(short_path, reformatted_path, target_w, target_h)
            short_path = reformatted_path

        final_path = short_path

        if req.category:
            code = LANG_CODE.get(req.language, "ur")
            intro_path = os.path.join(INTROS_DIR, req.category, f"intro_{code}.mp4")
            if os.path.isfile(intro_path):
                intro_clip = VideoFileClip(intro_path)
                short_clip = VideoFileClip(short_path)
                open_clips.extend([intro_clip, short_clip])
                combined = concatenate_videoclips([intro_clip, short_clip], method="compose")
                open_clips.append(combined)
                final_path = os.path.join(work_dir, "final_short.mp4")
                combined.write_videofile(
                    final_path, fps=24, codec="libx264",
                    audio_codec="aac", preset="ultrafast",
                    threads=2, logger=None,
                )
            else:
                logger.warning(f"No intro found for category='{req.category}', language='{req.language}' — skipping intro")

        with open(final_path, "rb") as f:
            short_b64 = base64.b64encode(f.read()).decode("utf-8")
        return {"video": f"data:video/mp4;base64,{short_b64}"}

    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg trim failed: {e.stderr}")
        raise HTTPException(status_code=500, detail="Could not create short")
    finally:
        safe_close(*open_clips)
        shutil.rmtree(work_dir, ignore_errors=True)


@app.get("/health")
async def health():
    cached_music = []
    if os.path.isdir(MUSIC_DIR):
        cached_music = [
            f[:-4] for f in os.listdir(MUSIC_DIR) if f.lower().endswith(".mp3")
        ]
    return {
        "status": "ok",
        "service": "NovaTube AI Video",
        "pexels_configured": bool(PEXELS_API_KEY),
        "pixabay_configured": bool(PIXABAY_API_KEY),
        "jamendo_configured": bool(JAMENDO_CLIENT_ID),
        "categories": list(CATEGORY_KEYWORDS.keys()),
        "cached_music": cached_music,
    }


import re as _re_json


class AutoShortRequest(BaseModel):
    video_base64: str
    script: list[str] | None = None
    category: str | None = None
    min_duration: int = 20
    max_duration: int = 59
    num_shorts: int = 1
    aspect_ratio: str = "9:16"


GROQ_API_KEY = os.getenv("GROQ_API_KEY")


def extract_audio(video_path: str, audio_out: str) -> bool:
    import subprocess
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "libmp3lame", audio_out],
            check=True, capture_output=True,
        )
        return True
    except Exception as e:
        logger.warning(f"Audio extraction failed: {e}")
        return False


def transcribe_with_groq(audio_path: str):
    if not GROQ_API_KEY:
        return None, None, None
    try:
        with open(audio_path, "rb") as f:
            resp = requests.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                files={"file": (os.path.basename(audio_path), f, "audio/mpeg")},
                data={"model": "whisper-large-v3", "response_format": "verbose_json"},
                timeout=120,
            )
        if resp.status_code != 200:
            logger.warning(f"Groq transcription failed ({resp.status_code}): {resp.text[:200]}")
            return None, None, None
        data = resp.json()
        segments = data.get("segments", [])
        text = data.get("text", "")
        language = data.get("language", "english")
        return text, segments, language
    except Exception as e:
        logger.warning(f"Transcription error: {e}")
        return None, None, None


def select_best_moment_with_groq(segments, min_duration: int, max_duration: int):
    if not GROQ_API_KEY or not segments:
        return None
    try:
        transcript_block = "\n".join(
            f"{s['start']:.1f} -> {s['end']:.1f}: {s['text'].strip()}" for s in segments
        )
        prompt = f"""You are selecting the best short-form video clip from a transcript with timestamps.

Transcript:
{transcript_block}

Pick the single best natural segment for a short video (YouTube Shorts/Reels style).
Rules:
- Prefer a strong hook, a complete thought, and high engagement potential.
- Never cut a sentence in the middle.
- Duration should be the SHORTEST natural length that contains the full engaging moment.
- Acceptable range: {min_duration} to {max_duration} seconds. Do not pad to reach {max_duration} unless the content needs it.

Respond with ONLY valid JSON, no extra text, in this exact format:
{{"start_time": <number>, "end_time": <number>, "duration": <number>, "reason": "<short explanation>", "score": <0-100 integer>}}"""

        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
            },
            timeout=60,
        )
        if resp.status_code != 200:
            logger.warning(f"Groq selection failed ({resp.status_code}): {resp.text[:200]}")
            return None

        content = resp.json()["choices"][0]["message"]["content"]
        match = _re_json.search(r"\{.*\}", content, _re_json.DOTALL)
        if not match:
            return None
        result = json.loads(match.group(0))

        required = {"start_time", "end_time", "duration", "reason", "score"}
        if not required.issubset(result.keys()):
            return None
        return result
    except Exception as e:
        logger.warning(f"Best-moment selection error: {e}")
        return None


def select_top_moments_with_groq(segments, min_duration: int, max_duration: int, count: int):
    if not GROQ_API_KEY or not segments:
        return []
    try:
        transcript_block = "\n".join(
            f"{s['start']:.1f} -> {s['end']:.1f}: {s['text'].strip()}" for s in segments
        )
        prompt = f"""You are selecting the best short-form video clips from a transcript with timestamps.

Transcript:
{transcript_block}

Pick the top {count} best NON-OVERLAPPING segments for short videos (YouTube Shorts/Reels style), ranked from strongest to weakest.
Rules:
- Prefer a strong hook, a complete thought, and high engagement potential in each one.
- Never cut a sentence in the middle.
- Duration should be the SHORTEST natural length that contains the full engaging moment.
- Acceptable range per clip: {min_duration} to {max_duration} seconds.
- Segments must not overlap each other in time.
- If fewer than {count} genuinely strong moments exist, return fewer — do not pad with weak ones.

Respond with ONLY valid JSON, no extra text, in this exact format:
{{"moments": [{{"start_time": <number>, "end_time": <number>, "duration": <number>, "reason": "<short explanation>", "score": <0-100 integer>}}]}}"""

        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
            },
            timeout=60,
        )
        if resp.status_code != 200:
            logger.warning(f"Groq multi-selection failed ({resp.status_code}): {resp.text[:200]}")
            return []

        content = resp.json()["choices"][0]["message"]["content"]
        match = _re_json.search(r"\{.*\}", content, _re_json.DOTALL)
        if not match:
            return []
        result = json.loads(match.group(0))
        moments = result.get("moments", [])

        valid = []
        for m in moments:
            if {"start_time", "end_time", "duration", "reason", "score"}.issubset(m.keys()):
                valid.append(m)
        return valid[:count]
    except Exception as e:
        logger.warning(f"Top-moments selection error: {e}")
        return []


@app.post("/auto-short")
async def auto_short(req: AutoShortRequest):
    work_dir = tempfile.mkdtemp(prefix="novatube_autoshort_")
    open_clips = []
    try:
        full_path = os.path.join(work_dir, "full.mp4")
        vdata = req.video_base64
        if vdata.startswith("data:"):
            vdata = vdata.split(",", 1)[1]
        with open(full_path, "wb") as f:
            f.write(base64.b64decode(vdata))

        source_video = VideoFileClip(full_path)
        total_duration = source_video.duration
        safe_close(source_video)

        detected_language = "English"
        segments = None

        if req.script:
            per_scene = total_duration / max(len(req.script), 1)
            segments = [
                {"start": i * per_scene, "end": (i + 1) * per_scene, "text": s}
                for i, s in enumerate(req.script)
            ]
        else:
            audio_path = os.path.join(work_dir, "audio.mp3")
            if extract_audio(full_path, audio_path):
                text, segs, lang = transcribe_with_groq(audio_path)
                if segs:
                    segments = segs
                    lang_map = {"en": "English", "ur": "Urdu", "ar": "Arabic"}
                    detected_language = lang_map.get(lang, lang.title() if lang else "English")

        num_shorts = max(1, min(req.num_shorts, 5))

        moments = []
        if segments:
            if num_shorts > 1:
                moments = select_top_moments_with_groq(segments, req.min_duration, req.max_duration, num_shorts)
            else:
                single = select_best_moment_with_groq(segments, req.min_duration, req.max_duration)
                if single:
                    moments = [single]

        if not moments:
            fallback_duration = min(45, total_duration)
            moments = [{
                "start_time": 0,
                "end_time": fallback_duration,
                "duration": fallback_duration,
                "reason": "Automatic detection unavailable — used a safe default segment.",
                "score": 0,
            }]

        results = []
        for idx, best in enumerate(moments):
            start_time = max(0, float(best["start_time"]))
            end_time = min(total_duration, float(best["end_time"]))
            if end_time <= start_time:
                end_time = min(total_duration, start_time + 30)

            short_path = os.path.join(work_dir, f"short_{idx}.mp4")
            import subprocess
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-ss", str(start_time),
                    "-i", full_path,
                    "-t", str(end_time - start_time),
                    "-c", "copy",
                    short_path,
                ],
                check=True, capture_output=True,
            )

            if req.aspect_ratio in ASPECT_RATIOS:
                target_w, target_h = ASPECT_RATIOS[req.aspect_ratio]
                reformatted_path = os.path.join(work_dir, f"reformatted_{idx}.mp4")
                reformat_video(short_path, reformatted_path, target_w, target_h)
                short_path = reformatted_path

            final_path = short_path
            if req.category:
                code = {"English": "en", "Urdu": "ur", "Arabic": "ar"}.get(detected_language, "en")
                intro_path = os.path.join(INTROS_DIR, req.category, f"intro_{code}.mp4")
                if os.path.isfile(intro_path):
                    intro_clip = VideoFileClip(intro_path)
                    short_clip = VideoFileClip(short_path)
                    open_clips.extend([intro_clip, short_clip])
                    combined = concatenate_videoclips([intro_clip, short_clip], method="compose")
                    open_clips.append(combined)
                    final_path = os.path.join(work_dir, f"final_short_{idx}.mp4")
                    combined.write_videofile(
                        final_path, fps=24, codec="libx264",
                        audio_codec="aac", preset="ultrafast",
                        threads=2, logger=None,
                    )

            with open(final_path, "rb") as f:
                short_b64 = base64.b64encode(f.read()).decode("utf-8")

            results.append({
                "video": f"data:video/mp4;base64,{short_b64}",
                "start_time": start_time,
                "end_time": end_time,
                "duration": end_time - start_time,
                "reason": best.get("reason", ""),
                "score": best.get("score", 0),
            })

        return {
            "shorts": results,
            "language": detected_language,
        }

    except Exception as e:
        logger.error(f"Auto-short failed: {e}")
        raise HTTPException(status_code=500, detail=f"Auto Short generation failed: {e}")
    finally:
        safe_close(*open_clips)
        shutil.rmtree(work_dir, ignore_errors=True)

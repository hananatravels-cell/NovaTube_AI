"""
NovaTube AI - Free Voice Generation Service
Primary: Edge TTS (Microsoft, free, high quality, no API key needed)
Fallback: Kokoro TTS (open-source, fully local, free forever)

Run with: uvicorn tts_service:app --host 0.0.0.0 --port 8001 --reload
"""

import base64
import io
import logging
import os
import tempfile

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("novatube-tts")

app = FastAPI(title="NovaTube AI - TTS Service")

# Allow the Next.js frontend (localhost:3000) to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Voice mapping: our friendly names -> real Edge TTS voice IDs
# Full list of Edge voices: run `edge-tts --list-voices` in terminal
# ---------------------------------------------------------------------------
EDGE_VOICE_MAP = {
    "Aria — Warm & Clear": "en-US-AriaNeural",
    "Noah — Deep & Confident": "en-US-GuyNeural",
    "Maya — Bright & Energetic": "en-US-JennyNeural",
    "Zayn — Calm & Reflective": "en-US-DavisNeural",
}

# Urdu / Roman Urdu voices (used automatically when language = Urdu/Roman Urdu)
EDGE_VOICE_MAP_UR = {
    "Aria — Warm & Clear": "ur-PK-UzmaNeural",
    "Noah — Deep & Confident": "ur-PK-AsadNeural",
    "Maya — Bright & Energetic": "ur-PK-UzmaNeural",
    "Zayn — Calm & Reflective": "ur-PK-AsadNeural",
}

ARABIC_VOICE_MAP = {
    "Aria — Warm & Clear": "ar-SA-ZariyahNeural",
    "Noah — Deep & Confident": "ar-SA-HamedNeural",
    "Maya — Bright & Energetic": "ar-SA-ZariyahNeural",
    "Zayn — Calm & Reflective": "ar-SA-HamedNeural",
}


class VoiceRequest(BaseModel):
    text: str
    voice: str = "Aria — Warm & Clear"
    language: str = "English"


def pick_edge_voice(voice: str, language: str) -> str:
    if language.lower() in ("urdu", "roman urdu"):
        return EDGE_VOICE_MAP_UR.get(voice, "ur-PK-UzmaNeural")
    if language.lower() == "arabic":
        return ARABIC_VOICE_MAP.get(voice, "ar-SA-ZariyahNeural")
    return EDGE_VOICE_MAP.get(voice, "en-US-AriaNeural")


async def generate_with_edge_tts(text: str, voice: str, language: str) -> bytes | None:
    """Primary provider: Microsoft Edge TTS (free, no key required)."""
    try:
        import edge_tts

        edge_voice = pick_edge_voice(voice, language)
        communicate = edge_tts.Communicate(text, edge_voice)

        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        if not audio_chunks:
            logger.warning("Edge TTS returned no audio data")
            return None

        return b"".join(audio_chunks)

    except Exception as e:
        logger.warning(f"Edge TTS failed: {e}")
        return None


def generate_with_kokoro(text: str, voice: str) -> bytes | None:
    """Fallback provider: Kokoro TTS (fully local, open-source)."""
    try:
        from kokoro_onnx import Kokoro
        import soundfile as sf

        model_path = os.getenv("KOKORO_MODEL_PATH", "kokoro-v0_19.onnx")
        voices_path = os.getenv("KOKORO_VOICES_PATH", "voices.bin")

        if not os.path.exists(model_path) or not os.path.exists(voices_path):
            logger.warning("Kokoro model files not found, skipping fallback")
            return None

        kokoro = Kokoro(model_path, voices_path)

        # Map our friendly voice names to a default Kokoro voice
        kokoro_voice = "af_sarah"  # default female voice
        samples, sample_rate = kokoro.create(text, voice=kokoro_voice, speed=1.0, lang="en-us")

        buf = io.BytesIO()
        sf.write(buf, samples, sample_rate, format="MP3")
        return buf.getvalue()

    except Exception as e:
        logger.warning(f"Kokoro TTS failed: {e}")
        return None


@app.post("/generate-voice")
async def generate_voice(req: VoiceRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    # 1. Try Edge TTS first (free, high quality, works for most cases)
    audio_bytes = await generate_with_edge_tts(req.text, req.voice, req.language)
    provider = "edge-tts"

    # 2. Fallback to Kokoro if Edge TTS fails
    if audio_bytes is None:
        audio_bytes = generate_with_kokoro(req.text, req.voice)
        provider = "kokoro"

    if audio_bytes is None:
        raise HTTPException(
            status_code=500,
            detail="Both Edge TTS and Kokoro TTS failed. Check server logs.",
        )

    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
    return {
        "audio": f"data:audio/mpeg;base64,{b64_audio}",
        "provider": provider,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "NovaTube AI TTS"}
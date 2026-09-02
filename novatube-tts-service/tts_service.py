"""
NovaTube AI - Free Voice Generation Service
Primary: Edge TTS (Microsoft, free, high quality, no API key needed)
Fallback 1: Groq Orpheus TTS (fast, reliable from cloud servers, English/Arabic only)
Fallback 2: Kokoro TTS (open-source, fully local, free forever)

Run with: uvicorn tts_service:app --host 0.0.0.0 --port 8001 --reload
"""

import base64
import io
import logging
import os
import re
import tempfile
import wave

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("novatube-tts")

app = FastAPI(title="NovaTube AI - TTS Service")

# Allow the Next.js frontend (localhost:3000, and any deployed origin) to call this service
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

# ---------------------------------------------------------------------------
# Groq Orpheus TTS — fast, reliable REST API (works from cloud servers,
# unlike Edge TTS which Microsoft sometimes blocks on datacenter IPs).
# Only supports English and Arabic. Max 200 characters per request, so
# longer scripts are split into chunks and the resulting WAV audio is
# concatenated into one file.
# ---------------------------------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_SPEECH_URL = "https://api.groq.com/openai/v1/audio/speech"
GROQ_MAX_CHARS = 190  # stay under the 200-char API limit with margin

GROQ_VOICE_MAP_EN = {
    "Aria — Warm & Clear": "hannah",
    "Noah — Deep & Confident": "daniel",
    "Maya — Bright & Energetic": "autumn",
    "Zayn — Calm & Reflective": "troy",
}

GROQ_VOICE_MAP_AR = {
    "Aria — Warm & Clear": "noura",
    "Noah — Deep & Confident": "fahad",
    "Maya — Bright & Energetic": "lulwa",
    "Zayn — Calm & Reflective": "sultan",
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


def _split_into_chunks(text: str, max_chars: int = GROQ_MAX_CHARS) -> list[str]:
    """Splits text into pieces no longer than max_chars, breaking on
    sentence boundaries where possible so words are never cut mid-way."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: list[str] = []
    current = ""

    for sentence in sentences:
        if len(sentence) > max_chars:
            # A single sentence is itself too long — break it on words.
            words = sentence.split()
            for word in words:
                candidate = (current + " " + word).strip() if current else word
                if len(candidate) > max_chars:
                    if current:
                        chunks.append(current)
                    current = word
                else:
                    current = candidate
            continue

        candidate = (current + " " + sentence).strip() if current else sentence
        if len(candidate) > max_chars:
            if current:
                chunks.append(current)
            current = sentence
        else:
            current = candidate

    if current:
        chunks.append(current)

    return [c for c in chunks if c.strip()]


def _concatenate_wav_bytes(wav_chunks: list[bytes]) -> bytes | None:
    """Concatenates multiple in-memory WAV byte-strings (all the same
    format) into a single playable WAV file."""
    if not wav_chunks:
        return None
    if len(wav_chunks) == 1:
        return wav_chunks[0]

    try:
        output_buffer = io.BytesIO()
        with wave.open(io.BytesIO(wav_chunks[0])) as first:
            params = first.getparams()

        with wave.open(output_buffer, "wb") as out_wav:
            out_wav.setparams(params)
            for chunk in wav_chunks:
                with wave.open(io.BytesIO(chunk)) as in_wav:
                    out_wav.writeframes(in_wav.readframes(in_wav.getnframes()))

        return output_buffer.getvalue()
    except Exception as e:
        logger.warning(f"WAV concatenation failed: {e}")
        return wav_chunks[0]  # better a partial clip than nothing


def generate_with_groq(text: str, voice: str, language: str) -> bytes | None:
    """Fallback provider: Groq's Orpheus TTS. Fast and works reliably from
    cloud servers, but only supports English and Arabic, and has a
    200-character-per-request limit — long text is chunked and the
    resulting WAV audio is stitched back together."""
    if not GROQ_API_KEY:
        logger.warning("Groq TTS skipped: GROQ_API_KEY not set")
        return None

    lang_lower = language.lower()
    if lang_lower == "arabic":
        model = "canopylabs/orpheus-arabic-saudi"
        voice_id = GROQ_VOICE_MAP_AR.get(voice, "noura")
    elif lang_lower == "english":
        model = "canopylabs/orpheus-v1-english"
        voice_id = GROQ_VOICE_MAP_EN.get(voice, "hannah")
    else:
        # Groq Orpheus doesn't support this language (e.g. Urdu/Roman Urdu)
        logger.info(f"Groq TTS skipped: unsupported language '{language}'")
        return None

    chunks = _split_into_chunks(text)
    if not chunks:
        return None

    wav_pieces: list[bytes] = []
    for i, chunk_text in enumerate(chunks):
        try:
            resp = requests.post(
                GROQ_SPEECH_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "voice": voice_id,
                    "input": chunk_text,
                    "response_format": "wav",
                },
                timeout=60,
            )
            if resp.status_code != 200:
                logger.warning(f"Groq TTS chunk {i} failed ({resp.status_code}): {resp.text[:200]}")
                return None
            wav_pieces.append(resp.content)
        except Exception as e:
            logger.warning(f"Groq TTS chunk {i} error: {e}")
            return None

    return _concatenate_wav_bytes(wav_pieces)


def generate_with_kokoro(text: str, voice: str) -> bytes | None:
    """Last-resort fallback: Kokoro TTS (fully local, open-source)."""
    try:
        from kokoro_onnx import Kokoro
        import soundfile as sf

        model_path = os.getenv("KOKORO_MODEL_PATH", "kokoro-v0_19.int8.onnx")
        voices_path = os.getenv("KOKORO_VOICES_PATH", "voices.bin")

        if not os.path.exists(model_path) or not os.path.exists(voices_path):
            logger.warning("Kokoro model files not found, skipping fallback")
            return None

        kokoro = Kokoro(model_path, voices_path)

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

    # 1. Primary: Kokoro (Fully local, no internet restrictions or rate limits)
    audio_bytes = generate_with_kokoro(req.text, req.voice)
    provider = "kokoro"
    mime = "audio/mpeg"

    # 2. Fallback 1: Edge TTS
    if audio_bytes is None:
        audio_bytes = await generate_with_edge_tts(req.text, req.voice, req.language)
        provider = "edge-tts"
        mime = "audio/mpeg"

    # 3. Last resort: Groq Orpheus
    if audio_bytes is None:
        audio_bytes = generate_with_groq(req.text, req.voice, req.language)
        provider = "groq"
        mime = "audio/wav"

    if audio_bytes is None:
        raise HTTPException(
            status_code=500,
            detail="Kokoro, Edge TTS, and Groq all failed. Check server logs.",
        )

    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
    return {
        "audio": f"data:{mime};base64,{b64_audio}",
        "provider": provider,
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "NovaTube AI TTS",
        "groq_configured": bool(GROQ_API_KEY),
    }
path = r"tts_service.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = """    # 1. Primary: Kokoro (Fully local, no internet restrictions or rate limits)
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
"""

new = """    # 1. Primary: Edge TTS
    audio_bytes = await generate_with_edge_tts(req.text, req.voice, req.language)
    provider = "edge-tts"
    mime = "audio/mpeg"

    # 2. Fallback 1: Groq Orpheus
    if audio_bytes is None:
        audio_bytes = generate_with_groq(req.text, req.voice, req.language)
        provider = "groq"
        mime = "audio/wav"

    # 3. Last resort: Kokoro
    if audio_bytes is None:
        audio_bytes = generate_with_kokoro(req.text, req.voice)
        provider = "kokoro"
        mime = "audio/mpeg"
"""

if old not in content:
    print("OLD BLOCK NOT FOUND - kuch match nahi hua, koi change nahi kiya gaya")
else:
    content = content.replace(old, new)
    content = content.replace(
        "Kokoro, Edge TTS, and Groq all failed. Check server logs.",
        "Edge TTS, Groq, and Kokoro all failed. Check server logs."
    )
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("DONE - order fixed: Edge TTS -> Groq -> Kokoro")
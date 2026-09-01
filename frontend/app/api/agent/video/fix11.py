import io
path = "app/api/agent/video/route.ts"
content = io.open(path, encoding="utf-8").read()

old = """    const videoRes = await fetch(`${VIDEO_SERVICE_URL}/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes,
        category: category || 'storytelling',
        audio_base64: audioBase64,
        orientation: orientation || 'vertical',
        want_music: true,
        intro_audio_base64: introAudioBase64 || null,
        intro_text: introText || '',
      }),
    });"""

new = """    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8 * 60 * 1000);

    let videoRes;
    try {
      videoRes = await fetch(`${VIDEO_SERVICE_URL}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenes,
          category: category || 'storytelling',
          audio_base64: audioBase64,
          orientation: orientation || 'vertical',
          want_music: true,
          intro_audio_base64: introAudioBase64 || null,
          intro_text: introText || '',
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }"""

assert old in content, "OLD NOT FOUND"
content = content.replace(old, new)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")

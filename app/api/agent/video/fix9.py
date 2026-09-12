import io
path = "frontend/app/api/agent/video/route.ts"
content = io.open(path, encoding="utf-8").read()

old1 = "    const { script, audioBase64, category, orientation, scenes: providedScenes } = await req.json();"
new1 = "    const { script, audioBase64, category, orientation, scenes: providedScenes, introAudioBase64, introText } = await req.json();"
assert old1 in content, "OLD1 NOT FOUND"
content = content.replace(old1, new1)

old2 = """        orientation: orientation || 'vertical',
        want_music: true,
      }),
    });"""
new2 = """        orientation: orientation || 'vertical',
        want_music: true,
        intro_audio_base64: introAudioBase64 || null,
        intro_text: introText || '',
      }),
    });"""
assert old2 in content, "OLD2 NOT FOUND"
content = content.replace(old2, new2)

io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
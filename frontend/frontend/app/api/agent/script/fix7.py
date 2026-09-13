import io
path = "frontend/app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()
old = "      scriptValue = scriptData.script;"
new = """      scriptValue = scriptData.script;

      try {
        const voiceSelectRes = await fetch('/api/agent/voice-select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: topicValue, category: detectedCategory }),
        });
        const voiceSelectData = await voiceSelectRes.json();
        if (voiceSelectData?.voice) {
          setVoice(voiceSelectData.voice);
        }
      } catch (voiceSelectErr) {
        console.error('voice-select error:', voiceSelectErr);
      }"""
assert old in content, "OLD BLOCK NOT FOUND"
content = content.replace(old, new)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
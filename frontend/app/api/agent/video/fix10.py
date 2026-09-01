import io
path = "frontend/app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()

old = """      updateStage('video', 'working');
      const videoRes = await fetch('/api/agent/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: scriptValue,
          audioBase64: voiceData.audio,
          category: detectedCategory,
          orientation: 'vertical',
          title: topicValue,
          scenes: sceneList.length > 0 ? sceneList : undefined,
        }),
      });"""

new = """      updateStage('video', 'working');

      let introAudioBase64 = '';
      const introTextMap: Record<string, string> = {
        english: `Today, let's talk about ${topicValue}.`,
        urdu: `آج ہم بات کریں گے ${topicValue} کے بارے میں۔`,
        roman_urdu: `Aaj hum baat karenge ${topicValue} ke baare mein.`,
        arabic: `اليوم سنتحدث عن ${topicValue}.`,
      };
      const introText = introTextMap[language] || introTextMap.english;

      try {
        const introVoiceRes = await fetch('/api/generate-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: introText,
            voice: VOICE_OPTIONS.find((v) => v.id === voice)?.label || 'Aria — Warm & Clear',
            language: LANGUAGE_OPTIONS.find((l) => l.id === language)?.label || 'English',
          }),
        });
        const introVoiceData = await introVoiceRes.json();
        if (introVoiceRes.ok && introVoiceData?.audio) {
          introAudioBase64 = introVoiceData.audio;
        }
      } catch (introErr) {
        console.error('intro voice error:', introErr);
      }

      const videoRes = await fetch('/api/agent/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: scriptValue,
          audioBase64: voiceData.audio,
          category: detectedCategory,
          orientation: 'vertical',
          title: topicValue,
          scenes: sceneList.length > 0 ? sceneList : undefined,
          introAudioBase64: introAudioBase64 || undefined,
          introText,
        }),
      });"""

assert old in content, "OLD NOT FOUND"
content = content.replace(old, new)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
import io
path = "frontend/app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()
old = """          text: scriptValue,
          voice: 'Aria — Warm & Clear',
          language: LANGUAGE_OPTIONS.find((l) => l.id === language)?.label || 'English',"""
new = """          text: scriptValue,
          voice: VOICE_OPTIONS.find((v) => v.id === voice)?.label || 'Aria — Warm & Clear',
          language: LANGUAGE_OPTIONS.find((l) => l.id === language)?.label || 'English',"""
assert old in content, "OLD BLOCK NOT FOUND"
content = content.replace(old, new)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
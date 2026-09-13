import io
path = r"C:\Users\HP\OneDrive\Desktop\NovaTube_AI\frontend\app\dashboard\agent\page.tsx"
content = io.open(path, encoding="utf-8").read()
old = """const LANGUAGE_OPTIONS = [
  { id: 'english', label: 'English' },
  { id: 'urdu', label: 'Urdu' },
  { id: 'roman_urdu', label: 'Roman Urdu' },
  { id: 'arabic', label: 'Arabic' },
];"""
new = old + """

const VOICE_OPTIONS = [
  { id: 'aria', label: 'Aria \u2014 Warm & Clear' },
  { id: 'noah', label: 'Noah \u2014 Deep & Confident' },
  { id: 'maya', label: 'Maya \u2014 Bright & Energetic' },
  { id: 'zayn', label: 'Zayn \u2014 Calm & Reflective' },
];"""
assert old in content, "OLD BLOCK NOT FOUND"
content = content.replace(old, new)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
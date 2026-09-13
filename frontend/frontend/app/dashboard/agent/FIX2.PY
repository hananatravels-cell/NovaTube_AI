import io
path = "frontend/app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()
old = "const [language, setLanguage] = useState('english');"
new = old + "\n  const [voice, setVoice] = useState('aria');"
assert old in content, "OLD BLOCK NOT FOUND"
content = content.replace(old, new)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
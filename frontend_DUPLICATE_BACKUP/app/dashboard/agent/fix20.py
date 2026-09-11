@'
import io
path = "app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()
tag = chr(60) + "a"

old = "                  {publishedUrl && (\n                    \n                      href={publishedUrl}"
new = "                  {publishedUrl && (\n                    " + tag + "\n                      href={publishedUrl}"

assert old in content, "OLD NOT FOUND"
content = content.replace(old, new, 1)

io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
'@ | Out-File -Encoding utf8 fix20.py
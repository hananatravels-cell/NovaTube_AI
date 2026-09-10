import io
path = "app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()

old = """                  {publishedUrl && (
                    
                      href={publishedUrl}"""
new = """                  {publishedUrl && (
                    
                      href={publishedUrl}"""

assert old in content, "OLD NOT FOUND"
content = content.replace(old, new, 1)

io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
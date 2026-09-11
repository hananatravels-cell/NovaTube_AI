import io
path = "app/dashboard/agent/page.tsx"
content = io.open(path, encoding="utf-8").read()

old = """                  {publishedUrl && (
                    
                      href={publishedUrl}
                      target="_blank\""""
new = """                  {publishedUrl && (
                    
                      href={publishedUrl}
                      target="_blank\""""

assert old in content, "OLD NOT FOUND"
content = content.replace(old, new, 1)

io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
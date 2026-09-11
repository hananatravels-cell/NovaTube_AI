import io
path = "../frontend/app/api/agent/video/route.ts"
content = io.open(path, encoding="utf-8").read()

old = "import { NextRequest, NextResponse } from 'next/server';"
new = """import { NextRequest, NextResponse } from 'next/server';
import { Agent, setGlobalDispatcher } from 'undici';

setGlobalDispatcher(new Agent({ headersTimeout: 10 * 60 * 1000, bodyTimeout: 10 * 60 * 1000 }));"""

assert old in content, "OLD NOT FOUND"
content = content.replace(old, new, 1)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
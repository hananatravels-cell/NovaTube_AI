import io
path = "app/api/agent/script/route.ts"
content = io.open(path, encoding="utf-8").read()

old = """    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are an expert YouTube scriptwriter. Output plain narration text only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq script error:', errText);
      return NextResponse.json({ error: 'Script generation failed' }, { status: 500 });
    }

    const data = await response.json();
    const script = data.choices[0].message.content.trim();"""

new = """    const messages = [
      { role: 'system', content: 'You are an expert YouTube scriptwriter. Output plain narration text only.' },
      { role: 'user', content: prompt },
    ];

    let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.8,
      }),
    });

    let usedFallback = false;
    if (response.status === 429 && process.env.OPENROUTER_API_KEY) {
      console.warn('Groq rate-limited, falling back to OpenRouter for script');
      usedFallback = true;
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages,
          temperature: 0.8,
        }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Script error (${usedFallback ? 'OpenRouter' : 'Groq'}):`, errText);
      return NextResponse.json({ error: 'Script generation failed' }, { status: 500 });
    }

    const data = await response.json();
    const script = data.choices[0].message.content.trim();"""

assert old in content, "OLD NOT FOUND"
content = content.replace(old, new)
io.open(path, "w", encoding="utf-8").write(content)
print("DONE")
import { NextRequest, NextResponse } from 'next/server';

const TRUNC_FLAG = ' [[TRUNCATED]]';

function splitTruncated(raw: string): { text: string; truncated: boolean } {
  if (raw.endsWith(TRUNC_FLAG)) {
    return { text: raw.slice(0, -TRUNC_FLAG.length), truncated: true };
  }
  return { text: raw, truncated: false };
}

async function callLLM(messages: any[], maxTokens: number): Promise<string> {
  // ✅ FIX 1: Aapke test ke mutabiq confirmed model
  const groqModel = 'openai/gpt-oss-120b';
  const openRouterModel = 'meta-llama/llama-3.1-70b-instruct';

  let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: groqModel,
      messages,
      temperature: 0.8,
      max_tokens: maxTokens,
    }),
  });

  if (response.status === 429 && process.env.OPENROUTER_API_KEY) {
    console.warn('Groq rate-limited, falling back to OpenRouter');
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'NovaTube AI',
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages,
        temperature: 0.8,
        max_tokens: maxTokens,
      }),
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('LLM call failed:', errText);
    throw new Error('Script generation failed');
  }
  
  // ✅ FIX 3: Syntax theek kiya gaya (data aur wordCount ki placement)
  const data = await response.json();
  const choice = data.choices[0];
  const text = choice.message.content.trim();
  return choice.finish_reason === 'length' ? text + TRUNC_FLAG : text;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Trims a trailing incomplete sentence, if the model's output happens
// to cut off mid-thought — this is what prevents the final video from
// ending abruptly on an unfinished sentence.
function trimToLastCompleteSentence(text: string): string {
  const trimmed = text.trim();
  const lastPunctuation = Math.max(
    trimmed.lastIndexOf('.'),
    trimmed.lastIndexOf('!'),
    trimmed.lastIndexOf('?')
  );
  // Only trim if there's a meaningful amount of complete text before
  // the cutoff — avoids nuking the whole script if punctuation is rare.
  if (lastPunctuation > trimmed.length * 0.5) {
    return trimmed.slice(0, lastPunctuation + 1).trim();
  }
  return trimmed;
}

// Kept for reference / possible future use, but no longer used to
// override the user's selected duration (see getDurationRange below).
const NICHE_DURATION_RANGES: { keywords: string[]; min: number; max: number }[] = [
  { keywords: ['kids stor', 'moral stor', 'fairy tale', 'bedtime'], min: 4, max: 8 },
  { keywords: ['true crime'], min: 15, max: 18 },
  { keywords: ['sport', 'football', 'cricket'], min: 6, max: 12 },
  { keywords: ['finance', 'personal finance', 'business', 'entrepreneur'], min: 8, max: 15 },
  { keywords: ['ai & technology', 'ai and technology', 'tech', 'gadget'], min: 6, max: 12 },
  { keywords: ['history', 'historical stor'], min: 10, max: 20 },
  { keywords: ['documentary'], min: 10, max: 20 },
  { keywords: ['facts & trivia', 'facts and trivia', 'trivia', 'knowledge'], min: 5, max: 10 },
  { keywords: ['education', 'science', 'space & astronomy', 'space and astronomy'], min: 8, max: 15 },
  { keywords: ['make money online'], min: 7, max: 15 },
  { keywords: ['home & garden', 'home and garden', 'diy & crafts', 'diy and crafts', 'food & recipes', 'food and recipes'], min: 5, max: 10 },
  { keywords: ['pets & animals', 'pets and animals', 'animal stor', 'nature & wildlife', 'nature and wildlife'], min: 5, max: 10 },
  { keywords: ['mystery'], min: 8, max: 15 },
  { keywords: ['news & current affairs', 'news and current affairs', 'celebrity news'], min: 5, max: 10 },
];

function getDurationRange(niche: string | undefined, fallbackMinutes: number): { min: number; max: number } {
  // The user's selected duration is now always the actual target —
  // niche-based recommended ranges are no longer used to override it.
  // This just gives a little flexibility either side of the selected
  // value, rather than forcing a fixed niche range regardless of what
  // was picked in the UI.
  return {
    min: Math.max(0.1, Math.round(fallbackMinutes * 0.85 * 10) / 10),
    max: Math.round(fallbackMinutes * 1.15 * 10) / 10,
  };
}

// Extra safety/tone guidance injected into the prompt for niches where
// YouTube ad-suitability and content-safety risk is meaningfully
// higher (true crime, mystery, horror). Keeps the whole pipeline
// generic for every other niche — this only adds text, it never
// changes behavior for unrelated niches.
const SENSITIVE_NICHE_GUIDANCE: { keywords: string[]; guidance: string }[] = [
  {
    keywords: ['true crime', 'mystery'],
    guidance: `
This is a true crime / mystery topic. Follow these safety rules strictly:
- Do NOT describe violence, injuries, or death in graphic or explicit detail. State what happened factually and briefly, without dwelling on gruesome specifics.
- Focus on the investigation, timeline, evidence, and how the case was solved (or remains unsolved) rather than on the violence itself.
- Do NOT write in the voice of, or as if narrated by, any real deceased victim. Narrate only in a neutral third-person documentary voice.
- Do NOT include unverified allegations as if they were confirmed fact — use words like "alleged" or "reportedly" where appropriate.
- Prefer cases that are historical (ideally decades old) and well-documented over recent or ongoing cases.`,
  },
  {
    keywords: ['horror'],
    guidance: `
This is a horror/mystery-toned topic. Keep it atmospheric and suspenseful rather than graphic — avoid gore or explicit violence in the narration.`,
  },
];

function getSensitiveGuidance(niche: string | undefined): string {
  if (!niche) return '';
  const lower = niche.toLowerCase();
  for (const entry of SENSITIVE_NICHE_GUIDANCE) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.guidance;
    }
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const { topic, durationMinutes, language, niche } = await req.json();

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const fallbackMinutes = durationMinutes || 3;
    const { min: minMinutes, max: maxMinutes } = getDurationRange(niche, fallbackMinutes);
    const sensitiveGuidance = getSensitiveGuidance(niche);

    // Use the midpoint of the range as a soft target for sizing the
    // initial generation request (max_tokens etc.) — the prompt itself
    // tells the model this is a guideline, not a requirement.
    const midMinutes = (minMinutes + maxMinutes) / 2;
    const targetWords = Math.round(midMinutes * 140);
    const minAcceptableWords = Math.max(10, Math.round(minMinutes * 140 * 0.6));
    const langInstruction = language ? `Write in ${language}.` : '';

    // For very short durations (quick tests), describe the target in
    // seconds instead of fractional minutes — "25 to 35 seconds" is a
    // much clearer instruction for the model than "0.4 to 0.6 minutes",
    // and prevents it from defaulting back to a much longer script.
    const rangeText = maxMinutes < 1
      ? `${Math.round(minMinutes * 60)} to ${Math.round(maxMinutes * 60)} seconds`
      : `${minMinutes} to ${maxMinutes} minutes`;

    const initialPrompt = `Write a complete, premium-quality, HIGHLY UNIQUE narration script. CRITICAL RULE: Do NOT use generic, overused, or repetitive angles (e.g., if the topic is a famous figure, do NOT write a basic biography. Instead, focus on ONE specific, lesser-known, untold, or highly dramatic moment, invention, or scientific miracle related to them).  (no headings, no scene markers, just spoken narration) for a YouTube video about:

"${topic}"
${sensitiveGuidance}

STRUCTURE — follow this order strictly:
1. OPENING HOOK (first 2-3 sentences): start with a gripping moment, a startling fact, a vivid scene, or a question the viewer needs answered. Never start with "Welcome", "Hello", "In this video", or a dry introduction. The viewer must be hooked immediately.
2. SETUP: give the context the viewer needs, briefly and clearly.
3. DEVELOPMENT: build the story or the explanation step by step, with rising interest, real details, and examples. Each part should lead naturally to the next.
4. CLIMAX / KEY REVELATION: the most important moment, answer, or turning point of the topic.
5. RESOLUTION: show how it ended, what it means, or what the viewer should take away.
6. CLOSING: one reflective closing thought, then a short, warm line inviting the viewer to keep watching the channel (rephrase naturally each time, never the same wording).

COMPLETENESS IS THE TOP PRIORITY. The story or topic must be told from its true beginning to its true end. Never start in the middle, never skip the resolution, never stop before the ending, and never end on an unfinished thought. Length is flexible: this type of content usually runs about ${rangeText}, but it is fine to be a little shorter or longer. Never pad, repeat points, or add filler just to reach a length, and never rush or cut the story short to save length.

STYLE: spoken, natural, and emotionally engaging. TITLE & METADATA RULE: The title and hashtags MUST be 100% unique and never reused from previous videos. , written to be read aloud by a voiceover artist. Mix short punchy sentences with longer flowing ones. ${langInstruction} Return ONLY the script text, nothing else — no quotes, no title, no formatting.`;

    let script = await callLLM(
      [
        {
          role: 'system',
          content: 'You are a world-class YouTube scriptwriter and storyteller. Every script you write opens with an irresistible hook, tells the complete story or explains the complete topic from its true beginning to its true end, and finishes with a satisfying conclusion followed by a brief, warm invitation to keep watching the channel. You never start in the middle, never stop before the ending, and never pad. Completeness and quality matter more than exact length.',
        },
        { role: 'user', content: initialPrompt },
      ],
      Math.max(2000, Math.round(targetWords * 2))
    );

    // ✅ FIX 2: [[TRUNCATED]] flag ko clean karein
    let { text: cleanScript, truncated } = splitTruncated(script);
    script = cleanScript;

    // Only continue the script if it came back clearly too short to
    // even minimally cover the topic (e.g. the model stopped early by
    // mistake) — this is a safety net, not a mechanism for padding out
    // to the recommended range.
    let attempts = 0;
    
    // ✅ FIX 2 (Continued): Agar script kat gayi ho (truncated) YA word count kam ho, to loop chalega
    while ((truncated || wordCount(script) < minAcceptableWords) && attempts < 2) {
      attempts++;
      const continuation = await callLLM(
        [
          {
            role: 'system',
            content: 'You are an expert YouTube scriptwriter continuing a narration script. Output plain narration text only — no repetition of what was already said, no headings.',
          },
          {
            role: 'user',
            content: `Here is a narration script so far, about "${topic}":\n\n${script}\n\n${truncated ? 'The previous text was cut off due to length limits. ' : ''}This script stopped too early and needs to properly finish covering the topic. Continue it naturally from where it left off, adding only what's genuinely needed to give the topic a complete, satisfying treatment — do not pad or repeat. End with a complete concluding thought followed by a brief, warm closing line inviting the viewer to keep watching the channel. ${langInstruction} Return ONLY the continuation text — do not repeat any earlier sentences, no quotes, no title.`,
          },
        ],
        Math.max(1500, Math.round((minAcceptableWords - wordCount(script)) * 2.5))
      );
      
      // ✅ FIX 2 (Continued): Continuation se naya truncated flag nikal kar variable update karein
      const { text: cleanContinuation, truncated: nextTruncated } = splitTruncated(continuation);
      truncated = nextTruncated;
      
      script = `${script} ${cleanContinuation}`.trim();
    }

    script = trimToLastCompleteSentence(script);

    return NextResponse.json({
      script,
      wordCount: wordCount(script),
      recommendedRange: { min: minMinutes, max: maxMinutes },
    });
  } catch (err) {
    console.error('agent/script error:', err);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

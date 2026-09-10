import { NextRequest, NextResponse } from 'next/server';

async function callLLM(messages: any[], maxTokens: number): Promise<string> {
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
      max_tokens: maxTokens,
    }),
  });

  if (response.status === 429 && process.env.OPENROUTER_API_KEY) {
    console.warn('Groq rate-limited, falling back to OpenRouter');
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
        max_tokens: maxTokens,
      }),
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error('LLM call failed:', errText);
    throw new Error('Script generation failed');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
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

    const initialPrompt = `Write a complete, natural-sounding narration script (no headings, no scene markers, just spoken narration) for a YouTube video about:

"${topic}"
${sensitiveGuidance}

This type of content usually runs somewhere between ${rangeText}, but that is only a guideline — the real goal is to cover the topic properly and naturally, with no padding, no filler, no repeated points, and no repeated scenes just to reach a longer length. If the topic is fully and engagingly covered in less time than the guideline, that is completely fine — stop there. If it genuinely needs a bit more to do the topic justice, that is also fine.

It should be engaging from the first sentence, written to be read aloud by a voiceover artist, with real depth, examples, or story details earned by the topic itself — not manufactured to hit a word count.

The script MUST end with a complete, natural concluding thought that wraps up the topic, followed by a short, warm closing line that invites the viewer to keep watching the channel (for example something like "keep watching for more stories like this" or "see you in the next one" — rephrase it naturally to fit the topic and tone, do not use the exact same wording every time). Never cut off mid-sentence or mid-idea. ${langInstruction} Return ONLY the script text, nothing else — no quotes, no title, no formatting.`;

    let script = await callLLM(
      [
        {
          role: 'system',
          content: 'You are an expert YouTube scriptwriter who writes to the natural length a topic deserves, never padding for duration, and always ends with a natural concluding thought plus a brief, warm invitation to keep watching the channel.',
        },
        { role: 'user', content: initialPrompt },
      ],
      Math.max(2000, Math.round(targetWords * 2))
    );

    // Only continue the script if it came back clearly too short to
    // even minimally cover the topic (e.g. the model stopped early by
    // mistake) — this is a safety net, not a mechanism for padding out
    // to the recommended range.
    let attempts = 0;
    while (wordCount(script) < minAcceptableWords && attempts < 2) {
      attempts++;
      const continuation = await callLLM(
        [
          {
            role: 'system',
            content: 'You are an expert YouTube scriptwriter continuing a narration script. Output plain narration text only — no repetition of what was already said, no headings.',
          },
          {
            role: 'user',
            content: `Here is a narration script so far, about "${topic}":\n\n${script}\n\nThis script stopped too early and needs to properly finish covering the topic. Continue it naturally from where it left off, adding only what's genuinely needed to give the topic a complete, satisfying treatment — do not pad or repeat. End with a complete concluding thought followed by a brief, warm closing line inviting the viewer to keep watching the channel. ${langInstruction} Return ONLY the continuation text — do not repeat any earlier sentences, no quotes, no title.`,
          },
        ],
        Math.max(1500, Math.round((minAcceptableWords - wordCount(script)) * 2.5))
      );
      script = `${script} ${continuation}`.trim();
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
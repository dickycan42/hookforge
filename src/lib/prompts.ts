// All LLM prompt templates live here — never inline in API routes.
// UI copy is English (global creator audience).

export type Platform = "tiktok" | "instagram" | "youtube" | "x";
export type GenerateType = "hooks" | "script" | "caption";

/** 5 hook variants, one per framework, validated downstream by hook-gate. */
export function hookPrompt(topic: string, platform: Platform): string {
  return `You are HookForge, an expert short-form content strategist for faceless creators.

TOPIC: "${topic}"
PLATFORM: ${platform}

Write EXACTLY 5 scroll-stopping video hooks, one per line, each labeled with its framework in brackets.

Frameworks (use each exactly once):
1. [curiosity] — curiosity gap: tease without revealing
2. [contrarian] — challenge a common belief about the topic
3. [callout] — speak directly to one viewer ("POV:", "If you...")
4. [cold-open] — drop into the most shocking moment mid-action
5. [stakes] — what is at risk / what they lose by scrolling past

RULES (strict):
- Each hook ≤ 25 words
- NEVER reveal the topic or the key fact in the first 8 words
- NEVER give away the answer inside the hook (no "because...", no payoff)
- EVERY hook must contain an open loop: an unanswered question, an ellipsis, or a "but..." turn
- Conversational, spoken tone — like talking to one friend. NO definitions ("X is a..."), NO lecture voice
- TTS-friendly: natural punctuation, CAPS for emphasis where a voice would stress a word
- No hashtags, no emojis in hooks

Output format — exactly 5 lines, nothing else:
[curiosity] ...
[contrarian] ...
[callout] ...
[cold-open] ...
[stakes] ...`;
}

export type ScriptDuration = 15 | 30 | 60;
export type ScriptLang = "en" | "id";

/** Beat-structured narration script with TTS prosody rules. */
export function scriptPrompt(
  hook: string,
  durationSec: ScriptDuration,
  lang: ScriptLang,
  topic?: string,
): string {
  const targetWords = Math.round((durationSec / 60) * 150);
  const minWords = Math.round(targetWords * 0.9);
  const maxWords = Math.round(targetWords * 1.1);
  const language =
    lang === "id"
      ? "Bahasa Indonesia (natural, conversational — logat Indonesia asli)"
      : "English (natural, conversational)";

  return `You are HookForge, writing a faceless short-form video narration script.

${topic ? `TOPIC: "${topic}"\n` : ""}HOOK (use verbatim as the opener): "${hook}"
TARGET DURATION: ${durationSec}s (~${targetWords} words at 150 wpm)
LANGUAGE: ${language}

Structure with these exact beat markers:
[HOOK] — the hook above, punchy delivery
[BODY] — the facts/story, paced for retention: short sentences, one idea per line, a re-hook every ~5 seconds ("but here's the part nobody talks about...")
[CLIFFHANGER] — end on an open loop or CTA. NEVER a flat summary.

TTS RULES (the script will be read by a voice synthesizer):
- Punctuation IS direction: commas = short pause, ... = longer beat, CAPS = stressed word
- One sentence per line
- No stage directions in brackets, no [Music] cues, no emojis
- Write for the ear: contractions, spoken numbers ("three" reads better than "3")

Length: ${minWords}–${maxWords} words total.`;
}

const CAPTION_CONSTRAINTS: Record<Platform, string> = {
  tiktok:
    "≤150 characters total, ≤5 hashtags. Do NOT repeat the video hook verbatim.",
  instagram:
    "Format: hook line, then value (2-3 lines), then CTA, then hashtags (8-12).",
  youtube:
    "First line = title-style hook (≤100 chars). Then 2-3 sentence description + 3-5 hashtags.",
  x: "≤280 characters TOTAL (count every URL as 23 chars). Punchy, repostable, ends with a question or bold claim.",
};

/** Platform-tailored caption with hard length limits. */
export function captionPrompt(
  topic: string,
  platform: Platform,
  hook?: string,
): string {
  return `You are HookForge, writing a social media caption.

TOPIC: "${topic}"
PLATFORM: ${platform}
${hook ? `VIDEO HOOK (for context — do NOT copy it verbatim): "${hook}"` : ""}

CONSTRAINTS: ${CAPTION_CONSTRAINTS[platform]}

RULES:
- English, conversational, no clickbait lies
- Match the platform's native voice
- Output ONLY the caption, no commentary`;
}

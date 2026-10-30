# Design — HookForge MVP

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌───────────┐
│  Next.js UI │────▶│  API routes      │────▶│  LLM      │
│  (Vercel)   │◀────│  (streaming)     │◀────│  (Kiro $) │
└─────────────┘     └──────────────────┘     └───────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Upstash Redis│  (topic history, 90d TTL)
                    └──────────────┘
```

Single Next.js app on Vercel. No separate backend — API routes handle generation
and freshness checks. Streaming via Vercel AI SDK for perceived speed.

## Components

### 1. Generator UI (`src/app/page.tsx`)
- Topic input + platform pills + duration selector
- Three tabs: Hooks / Script / Caption
- Streaming text area with copy buttons
- Freshness warning banner

### 2. Generation API (`src/app/api/generate/route.ts`)
- POST { type: 'hooks'|'script'|'caption', topic, platform, options }
- Builds prompt from `src/lib/prompts.ts`, streams LLM response
- For hooks: post-processes each hook through `hook-gate.ts` validator;
  failed hooks are regenerated once, then flagged (never silently dropped)

### 3. Hook Gate (`src/lib/hook-gate.ts`)
Pure-function validators implementing the 4 checks:
- `noEarlyReveal(hook, topic)` — topic keywords absent from first 8 words
- `withholdsAnswer(hook)` — no payoff phrases ("because", "the answer is")
- `hasOpenLoop(hook)` — contains "?" or open-loop patterns
- `isConversational(hook)` — rejects definition patterns ("X is a...")

### 4. Freshness (`src/lib/freshness.ts` + `api/freshness/route.ts`)
- Normalize topic (lowercase, strip stopwords) → similarity vs stored topics
- Jaccard similarity ≥ 0.8 → warn

### 5. Prompts (`src/lib/prompts.ts`)
- `hookPrompt(topic, platform)` — 5 variants, framework-labeled, TTS-aware
- `scriptPrompt(hook, duration, lang)` — beat-structured, punctuation-driven
- `captionPrompt(topic, platform)` — length-constrained per platform

## Data Flow
1. User enters topic → freshness check runs in parallel with hook generation
2. Hooks stream in → each validated by hook-gate → UI shows pass/fail badge
3. User picks hook → script generation → caption generation (chained, cancellable)

## Error Handling
- LLM timeout (30s) → friendly retry UI, no stack traces
- Redis down → freshness check degrades to "unknown", generation continues
- Rate limit: 20 generations/hour/IP (in-memory, MVP)

## Testing Strategy
- Vitest unit tests for all `hook-gate.ts` validators (positive + negative cases)
- Prompt snapshot tests (ensure template changes are deliberate)
- Manual QA checklist for UI flows before demo recording

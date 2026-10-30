# HookForge — Devpost Submission (Kiroween 2026)

**Category:** Frankenstein
**Live app:** https://hookforge-hlve.vercel.app
**Repo:** https://github.com/dickycan42/hookforge
**Demo video:** <YOUTUBE_URL> (< 3 min)

---

## Inspiration

I run a faceless-AI content operation: multiple brands across TikTok, Instagram,
YouTube Shorts, and X, posting daily. Every video needs three things — a hook
that stops the scroll, a script that holds attention, and a caption that
converts. Doing that by hand, every day, for every platform, is a grind.

HookForge compresses hours of content planning into seconds: enter a topic, get
validated hooks, a full narration script, and platform-ready captions.

## What it does

1. **Hook Generator** — 5 scroll-stopping hooks per topic across 5 frameworks
   (curiosity gap, contrarian, callout, cold-open, stakes). Every hook passes
   through a 4-check programmatic quality gate:
   - No topic reveal in the first 2 seconds
   - Answer withheld until mid/end
   - At least one open loop
   - Conversational tone (no dry definitions)
   Failing hooks get one regeneration pass; persistent failures are flagged
   `[needs review]` — never silently dropped.
2. **Script Builder** — full narration script with TTS-friendly punctuation
   (commas and periods as prosody direction), 15/30/60s durations, EN/ID,
   beat structure (HOOK → BODY → CLIFFHANGER).
3. **Caption Composer** — platform-specific captions with enforced length
   limits (X ≤ 280, TikTok ≤ 150).
4. **Topic Freshness Check** — fuzzy matching (Jaccard) over a 90-day topic
   history warns you before repeating content across platforms.

## How I built it (Kiro usage)

HookForge was built **spec-first with Kiro**:

- **Specs** (`.kiro/specs/hookforge/`): I wrote `requirements.md` (4 user
  stories + acceptance criteria), then `design.md` (architecture, sequence
  diagrams, API contracts), then `tasks.md` (12 tasks in 4 dependency waves).
  Every line of code traces back to an acceptance criterion.
- **Steering** (`.kiro/steering/`): `product.md` (what/why/who), `tech.md`
  (Next.js 15, TypeScript, Vercel AI SDK, Upstash Redis), and `structure.md`
  (conventions) were loaded into every generation session, keeping output
  consistent across waves.
- **Hooks** (`.kiro/hooks/dev-quality.json`): lint + typecheck run
  automatically on file save, catching type errors before they compound.
- **MCP**: evaluated the fetch MCP for competitor-hook research; deferred to
  post-MVP to keep the submission focused.

Build order followed the spec's dependency graph: validators and prompts
(Wave 1) → streaming API routes + 34 Vitest tests (Wave 2) → generator UI
with freshness banner and localStorage history (Wave 3) → deploy + docs
(Wave 4).

## The Frankenstein stitch

HookForge combines technologies not normally found together in one tool:

| Piece | Origin |
|---|---|
| LLM text generation | creative AI |
| 4-check hook gate (pure functions) | content psychology, programmatic |
| TTS prosody rules | speech synthesis engineering |
| Cross-platform fuzzy dedupe | information retrieval |

An LLM alone writes decent hooks; the gate makes them *reliably* good. TTS
rules make scripts sound human when voiced. Dedupe keeps a multi-platform
schedule fresh. None of these belong together — stitched, they become a
content machine.

## Challenges

- **Streaming + validation**: hooks stream token-by-token, but the gate needs
  complete text. Solution: buffer per hook, validate, regenerate failures once,
  then stream the final set with a gate-score header (`X-HookForge-Gate: 5/5`).
- **Zero-key demo**: the app must work for judges with no API keys. Built a
  deterministic mock LLM provider (topic-aware, gate-compliant) behind the
  same interface as the real provider — swap via env vars, no code changes.
- **Redis-optional freshness**: Upstash credentials may be absent. The
  freshness module degrades gracefully to `"unknown"` instead of blocking
  generation.

## What's next

- Real LLM provider keys (OpenAI-compatible) for production quality
- Upstash Redis for persistent cross-device topic history
- User accounts + saved hook libraries
- Ship as a paid micro-SaaS for faceless creators post-hackathon

## Built with

Next.js 15 · TypeScript · Tailwind CSS · Vercel AI SDK v4 · Upstash Redis ·
Vitest · Kiro (specs, steering, hooks)

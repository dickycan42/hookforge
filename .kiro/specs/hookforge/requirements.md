# Requirements — HookForge MVP

## User Stories

### US-1: Generate hooks from a topic
**As a** faceless content creator,
**I want** to enter a topic and get 5 hook variants,
**So that** I can pick a scroll-stopping opener without writer's block.

**Acceptance Criteria:**
- [ ] Input: topic text (1–120 chars) + platform selector (TikTok/IG/YT/X)
- [ ] Output: 5 hooks, each ≤ 25 words, labeled by framework (curiosity/contrarian/callout/cold-open/stakes)
- [ ] Each hook passes the 4-check gate (validated programmatically):
  1. Does not reveal the topic/fact in the first 2 seconds of reading
  2. Withholds the answer (no payoff in the hook itself)
  3. Contains ≥1 open loop or unanswered question
  4. Conversational tone (no definitions, no "X is...")
- [ ] Generation streams token-by-token; total latency < 15s

### US-2: Build a full script from a hook
**As a** creator,
**I want** to expand a chosen hook into a full narration script,
**So that** I can paste it into TTS and produce a video.

**Acceptance Criteria:**
- [ ] Input: selected hook + target duration (15s/30s/60s) + language (EN/ID)
- [ ] Output: script with beat markers (HOOK / BODY / CLIFFHANGER), TTS punctuation (commas, ellipses, CAPS for emphasis)
- [ ] Script ends with a cliffhanger or CTA, never a flat summary
- [ ] Word count matches duration (±10% at 150 wpm)

### US-3: Compose platform caption
**As a** creator,
**I want** a caption tailored to the posting platform,
**So that** I don't rewrite manually per platform.

**Acceptance Criteria:**
- [ ] TikTok: ≤150 chars, ≤5 hashtags, hook not repeated verbatim
- [ ] X: ≤280 chars (URLs counted as 23 chars)
- [ ] IG: hook + value + CTA + hashtags
- [ ] One-click copy button per caption

### US-4: Topic freshness check
**As a** creator running daily content,
**I want** a warning if I reuse a recent topic,
**So that** I don't repeat content across platforms.

**Acceptance Criteria:**
- [ ] On generate, topic is fuzzy-matched against last 90 days of history
- [ ] Match ≥ 80% similarity → warning banner with date of last use
- [ ] History stored in Redis with 90-day TTL

## Non-Functional
- Public deploy URL (Vercel) for Devpost submission
- `.kiro/` directory at repo root (hackathon requirement)
- 3-minute demo video script prepared
- All copy in English

# Tech Stack — HookForge

## Frontend
- **Next.js 15** (App Router) + **TypeScript** — fast iteration, easy Vercel deploy
- **Tailwind CSS** — utility styling, dark-mode-first UI
- **React** — interactive hook/script editor

## Backend
- **Next.js API routes** — single deployable unit
- **Vercel AI SDK** — streaming LLM responses
- **Model:** via Kiro credits / configurable provider (OpenAI-compatible endpoint)

## Data
- **Upstash Redis** (free tier) — topic freshness dedupe store (TTL 90 days)
- No user accounts for MVP — localStorage for history

## Dev Tools
- **Kiro** — spec-driven development, agent hooks, steering
- **ESLint + Prettier** — enforced via Kiro PostFileSave hook
- **Vitest** — unit tests for hook-gate validators

## Constraints
- Must deploy to a public URL for Devpost submission
- Must be built with Kiro (specs, hooks, steering, MCP usage documented)
- Repo must keep `.kiro/` directory at root, never in .gitignore
- 3-minute demo video required for submission

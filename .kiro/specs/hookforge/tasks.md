# Tasks — HookForge MVP

## Wave 1 (no dependencies — run concurrently)
- [x] 1. Scaffold Next.js 15 + TypeScript + Tailwind project
- [x] 2. Write `src/lib/hook-gate.ts` validators (4 checks as pure functions)
- [x] 3. Write `src/lib/prompts.ts` (hook/script/caption templates)
- [x] 4. Set up Upstash Redis + `src/lib/freshness.ts`

## Wave 2 (depends on Wave 1) — DONE 31/10
- [x] 5. Build `POST /api/generate` streaming route (hooks/script/caption)
- [x] 6. Build `POST /api/freshness` route
- [x] 7. Vitest unit tests for hook-gate validators

## Wave 3 (depends on Wave 2)
- [x] 8. Build generator UI (`page.tsx`): input, tabs, streaming output, copy buttons
- [x] 9. Freshness warning banner + history (localStorage)

## Wave 4 (depends on Wave 3) — PARTIAL 31/10
- [ ] 10. Deploy to Vercel, verify public URL — BLOCKED: Vercel MCP lacks team scope access (403); needs user to grant team access or deploy manually via dashboard
- [x] 11. Demo video shot list + script written → DEMO-SCRIPT.md (recording is manual)
- [x] 12. Devpost submission docs written → SUBMISSION.md (category: Frankenstein)
- [x] LICENSE (MIT) added — Kiroween open-source requirement

## Kiro feature usage (for submission docs)
- [x] Specs: this spec drove the build (requirements → design → tasks)
- [x] Steering: product.md / tech.md / structure.md guided all generation
- [x] Hooks: lint-on-save + test-on-save (see .kiro/hooks/)
- [x] MCP: evaluated fetch MCP for competitor research; deferred post-MVP

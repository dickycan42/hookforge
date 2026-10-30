# Project Structure — HookForge

```
hookforge/
├── .kiro/                    # Kiro configuration (REQUIRED by Kiroween rules)
│   ├── steering/             # product.md, tech.md, structure.md + domain files
│   ├── specs/hookforge/      # requirements.md, design.md, tasks.md
│   └── hooks/                # lint-on-save.json, test-on-save.json
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Landing + generator UI
│   │   ├── api/generate/     # Hook/script/caption generation endpoint
│   │   └── api/freshness/    # Topic dedupe check endpoint
│   ├── lib/
│   │   ├── hook-gate.ts      # 4-check hook validator (pure functions, tested)
│   │   ├── prompts.ts        # LLM prompt templates
│   │   └── freshness.ts      # Redis dedupe logic
│   └── components/           # UI components
├── public/                   # Static assets
├── package.json
├── tsconfig.json
├── README.md
└── .gitignore                # must NOT include .kiro/
```

## Conventions
- All LLM prompts live in `src/lib/prompts.ts` — never inline in routes
- Validators in `src/lib/` are pure functions with Vitest coverage
- API routes return streaming responses via Vercel AI SDK
- UI copy in English (global creator audience)

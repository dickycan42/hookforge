// POST /api/generate — hook / script / caption generation (streaming).
//
// - hooks:   generateText → hook-gate validation → one regeneration pass
//            for failures → still-failing hooks are FLAGGED, never dropped
//            → final text streamed back as plain text.
// - script / caption: true token streaming via Vercel AI SDK.
// - In-memory rate limit: 20 generations / hour / IP (MVP).
// - Mock mode (no OPENAI_API_KEY): deterministic local mock, flagged via
//   the X-HookForge-Mock response header.

import { generateText, streamText } from "ai";
import { getModel, isMockMode } from "@/lib/llm";
import {
  hookPrompt,
  scriptPrompt,
  captionPrompt,
  type Platform,
  type GenerateType,
  type ScriptDuration,
  type ScriptLang,
} from "@/lib/prompts";
import { validateHook } from "@/lib/hook-gate";
import { recordTopic } from "@/lib/freshness";

export const maxDuration = 60;

const PLATFORMS: Platform[] = ["tiktok", "instagram", "youtube", "x"];
const TYPES: GenerateType[] = ["hooks", "script", "caption"];
const DURATIONS: ScriptDuration[] = [15, 30, 60];
const LANGS: ScriptLang[] = ["en", "id"];
const FRAMEWORKS = ["curiosity", "contrarian", "callout", "cold-open", "stakes"];

// ---------------------------------------------------------------------------
// Rate limit (in-memory, per-IP, 20/hour)
// ---------------------------------------------------------------------------

const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 10_000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false; // over the limit
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

// ---------------------------------------------------------------------------
// Hook post-processing
// ---------------------------------------------------------------------------

function parseHookLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\[[\w-]+\]/.test(l));
}

function frameworkOf(line: string): string | null {
  const m = line.match(/^\[([\w-]+)\]/);
  return m && FRAMEWORKS.includes(m[1]) ? m[1] : null;
}

function repairPrompt(
  topic: string,
  platform: Platform,
  failedLines: string[],
): string {
  return [
    `The following video hooks FAILED quality validation for the topic "${topic}" on ${platform}:`,
    ``,
    ...failedLines,
    ``,
    `Regenerate ONLY these frameworks, one per line, keeping the same [framework] label format.`,
    `Rules: each hook ≤ 25 words; NEVER reveal the topic in the first 8 words;`,
    `NEVER give away the answer inside the hook; EVERY hook must contain an open loop`,
    `(an unanswered question, an ellipsis, or a "but..." turn); conversational spoken tone, no definitions.`,
    `Output exactly ${failedLines.length} line(s), nothing else.`,
  ].join("\n");
}

function stripFrameworkLabel(hook: string): string {
  return hook.replace(/^\[[\w-]+\]\s*/, "").trim();
}

interface HooksResult {
  text: string;
  passed: number;
  total: number;
}

async function generateHooks(
  topic: string,
  platform: Platform,
): Promise<HooksResult> {
  const model = getModel();
  const signal = AbortSignal.timeout(30_000);

  const first = await generateText({
    model,
    prompt: hookPrompt(topic, platform),
    abortSignal: signal,
  });
  const hooks = parseHookLines(first.text);

  // One regeneration pass for hooks that fail the gate.
  const failedNow = hooks.filter((h) => !validateHook(h, topic).passed);
  if (failedNow.length > 0 && hooks.length > 0) {
    const repair = await generateText({
      model,
      prompt: repairPrompt(topic, platform, failedNow),
      abortSignal: signal,
    });
    for (const line of parseHookLines(repair.text)) {
      const fw = frameworkOf(line);
      if (!fw) continue;
      const idx = hooks.findIndex(
        (h) => frameworkOf(h) === fw && !validateHook(h, topic).passed,
      );
      if (idx >= 0) hooks[idx] = line;
    }
  }

  // Flag (never silently drop) anything still failing.
  const final = hooks.map((h) =>
    validateHook(h, topic).passed ? h : `${h} [review]`,
  );
  const passed = final.filter((h) => !h.endsWith("[review]")).length;

  // Best-effort freshness history — never blocks the response.
  recordTopic(topic);

  return { text: final.join("\n"), passed, total: final.length };
}

/** Emit plain text as a word-chunked stream (simulated streaming UX). */
function streamedTextResponse(
  text: string,
  headers: Record<string, string>,
): Response {
  const encoder = new TextEncoder();
  const chunks = text.split(/(\s+)/);
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
        i += 1;
        if (i % 4 === 0) await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      ...headers,
    },
  });
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

interface GenerateBody {
  type?: unknown;
  topic?: unknown;
  platform?: unknown;
  hook?: unknown;
  durationSec?: unknown;
  lang?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!isRateLimited(ip)) {
    return Response.json(
      { error: "Rate limit reached — 20 generations per hour. Try again later." },
      { status: 429 },
    );
  }

  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const type = body.type;
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const platform: Platform = PLATFORMS.includes(body.platform as Platform)
    ? (body.platform as Platform)
    : "tiktok";

  if (!TYPES.includes(type as GenerateType)) {
    return Response.json(
      { error: "type must be one of: hooks, script, caption." },
      { status: 400 },
    );
  }
  if (!topic) {
    return Response.json({ error: "topic is required." }, { status: 400 });
  }
  if (topic.length > 200) {
    return Response.json(
      { error: "topic must be 200 characters or fewer." },
      { status: 400 },
    );
  }

  const extraHeaders: Record<string, string> = {};
  if (isMockMode()) extraHeaders["X-HookForge-Mock"] = "1";

  try {
    if (type === "hooks") {
      const { text, passed, total } = await generateHooks(
        topic,
        platform,
      );
      return streamedTextResponse(text, {
        ...extraHeaders,
        "X-HookForge-Gate": `${passed}/${total}`,
      });
    }

    const model = getModel();
    const signal = AbortSignal.timeout(30_000);

    if (type === "script") {
      const hook =
        typeof body.hook === "string" && body.hook.trim()
          ? stripFrameworkLabel(body.hook.trim())
          : "";
      const durationSec: ScriptDuration = DURATIONS.includes(
        body.durationSec as ScriptDuration,
      )
        ? (body.durationSec as ScriptDuration)
        : 30;
      const lang: ScriptLang = LANGS.includes(body.lang as ScriptLang)
        ? (body.lang as ScriptLang)
        : "en";
      const result = streamText({
        model,
        prompt: scriptPrompt(hook, durationSec, lang, topic),
        abortSignal: signal,
      });
      return result.toTextStreamResponse({ headers: extraHeaders });
    }

    // caption
    const hook =
      typeof body.hook === "string" && body.hook.trim()
        ? stripFrameworkLabel(body.hook.trim())
        : undefined;
    const result = streamText({
      model,
      prompt: captionPrompt(topic, platform, hook),
      abortSignal: signal,
    });
    return result.toTextStreamResponse({ headers: extraHeaders });
  } catch (err) {
    // Never leak stack traces to the client.
    console.error("[/api/generate]", err instanceof Error ? err.message : err);
    return Response.json(
      { error: "Generation failed. Please try again." },
      { status: 500 },
    );
  }
}

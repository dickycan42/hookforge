// LLM provider factory.
// Real provider (OpenAI-compatible) when OPENAI_API_KEY is set,
// otherwise a deterministic mock so the app + demo work with zero keys.
// Swap in real credentials via env — no code changes needed.

import type { LanguageModelV1, LanguageModelV1StreamPart } from "ai";
import { openai } from "@ai-sdk/openai";
import { MockLanguageModelV1, simulateReadableStream } from "ai/test";

/** True when no real LLM credentials are configured. */
export function isMockMode(): boolean {
  return !process.env.OPENAI_API_KEY;
}

function realModel(): LanguageModelV1 {
  // OPENAI_BASE_URL lets this point at any OpenAI-compatible endpoint.
  return openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");
}

// ---------------------------------------------------------------------------
// Mock content — deterministic, hook-gate compliant, topic-aware.
// ---------------------------------------------------------------------------

function extractPromptText(prompt: unknown): string {
  if (!Array.isArray(prompt)) return "";
  const parts: string[] = [];
  for (const msg of prompt as Array<{ content?: unknown }>) {
    const content = msg.content;
    if (typeof content === "string") {
      parts.push(content);
      continue;
    }
    if (Array.isArray(content)) {
      for (const part of content as Array<{ type?: string; text?: string }>) {
        if (part?.type === "text" && typeof part.text === "string") {
          parts.push(part.text);
        }
      }
    }
  }
  return parts.join("\n");
}

function topicFromPrompt(text: string): string {
  const m = text.match(/TOPIC:\s*"([^"]+)"/);
  return m ? m[1] : "your topic";
}

function platformFromPrompt(text: string): string {
  const m = text.match(/PLATFORM:\s*(\w+)/);
  return m ? m[1].toLowerCase() : "tiktok";
}

/**
 * 5 framework-labeled hooks. Topic keywords are kept out of the first
 * 8 tokens so they pass the noEarlyReveal gate; every hook carries an
 * open loop and withholds the payoff.
 */
function mockHooks(topic: string): string {
  return [
    `[curiosity] Stop scrolling right now — what nobody ever tells you about ${topic} will surprise you...`,
    `[contrarian] Forget everything you think you know — the real story behind ${topic} is the exact opposite...`,
    `[callout] POV: you're about to learn the one thing nobody mentions about ${topic}...`,
    `[cold-open] It happened in seconds, and the footage of ${topic} left everyone speechless...`,
    `[stakes] Keep scrolling if you want, but you'll miss the ${topic} secret that changes everything...`,
  ].join("\n");
}

function mockScript(topic: string, hook: string): string {
  const opener =
    hook ||
    `Stop scrolling right now — what nobody ever tells you about ${topic} will surprise you...`;
  return [
    `[HOOK] ${opener}`,
    `[BODY]`,
    `Here's the thing most people get wrong about ${topic}.`,
    `The real story is simpler than you think, and it starts with one small shift.`,
    `But here's the part nobody talks about...`,
    `[CLIFFHANGER]`,
    `Want the full breakdown? Don't scroll yet...`,
  ].join("\n");
}

function mockCaption(topic: string, platform: string): string {
  switch (platform) {
    case "x":
      return `The ${topic} trick nobody talks about... what's YOUR take?`;
    case "instagram":
      return [
        `${topic} — stop doing it wrong.`,
        ``,
        `Here's what actually works (save this):`,
        `1. Hook first, explain later`,
        `2. One idea per video`,
        ``,
        `Follow for daily creator tips.`,
      ].join("\n");
    case "youtube":
      return [
        `${topic}: What Nobody Tells Beginners`,
        ``,
        `The short version of what actually matters, plus the one mistake to avoid.`,
        ``,
        `#contentcreator #faceless #shorts`,
      ].join("\n");
    default: // tiktok
      return `POV: you finally cracked ${topic}\n#fyp #contentcreator #faceless #tips #viral`;
  }
}

function mockTextFor(promptText: string): string {
  const topic = topicFromPrompt(promptText);
  const platform = platformFromPrompt(promptText);
  if (/FAILED quality validation|Regenerate ONLY/i.test(promptText)) {
    return mockHooks(topic); // repair pass: emit clean hooks
  }
  if (/scroll-stopping video hooks/i.test(promptText)) return mockHooks(topic);
  if (/narration script/i.test(promptText)) {
    const hm = promptText.match(
      /HOOK \(use verbatim as the opener\):\s*"([^"]+)"/,
    );
    return mockScript(topic, hm ? hm[1] : "");
  }
  if (/social media caption/i.test(promptText)) {
    return mockCaption(topic, platform);
  }
  return `Mock response for: ${topic}`;
}

function mockModel(): LanguageModelV1 {
  return new MockLanguageModelV1({
    provider: "hookforge-mock",
    modelId: "mock-1",
    doGenerate: async (options) => {
      const text = mockTextFor(extractPromptText(options.prompt));
      return {
        rawCall: { rawPrompt: null, rawSettings: {} },
        finishReason: "stop" as const,
        usage: { promptTokens: 10, completionTokens: text.length },
        text,
      };
    },
    doStream: async (options) => {
      const text = mockTextFor(extractPromptText(options.prompt));
      const words = text.split(/(\s+)/);
      const chunks: LanguageModelV1StreamPart[] = words.map((w) => ({
        type: "text-delta",
        textDelta: w,
      }));
      chunks.push({
        type: "finish",
        finishReason: "stop",
        usage: { promptTokens: 10, completionTokens: words.length },
      });
      return {
        stream: simulateReadableStream({ chunks, chunkDelayInMs: 8 }),
        rawCall: { rawPrompt: null, rawSettings: {} },
      };
    },
  });
}

/** The model to use for generation — real or mock. */
export function getModel(): LanguageModelV1 {
  return isMockMode() ? mockModel() : realModel();
}

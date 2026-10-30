// Snapshot + constraint tests for LLM prompt templates (src/lib/prompts.ts).
// Snapshots make template changes deliberate — update with `vitest -u`.

import { describe, it, expect } from "vitest";
import { hookPrompt, scriptPrompt, captionPrompt } from "./prompts";

describe("hookPrompt", () => {
  it("matches snapshot", () => {
    expect(hookPrompt("deep sea creatures", "tiktok")).toMatchSnapshot();
  });

  it("includes the topic and all 5 frameworks", () => {
    const p = hookPrompt("deep sea creatures", "tiktok");
    expect(p).toContain("deep sea creatures");
    for (const fw of ["curiosity", "contrarian", "callout", "cold-open", "stakes"]) {
      expect(p).toContain(fw);
    }
  });

  it("mentions the platform", () => {
    expect(hookPrompt("cats", "x")).toContain("x");
  });
});

describe("scriptPrompt", () => {
  it("matches snapshot", () => {
    expect(scriptPrompt("Test hook...", 30, "en")).toMatchSnapshot();
  });

  it("uses the hook verbatim and targets the right word count", () => {
    const p = scriptPrompt("My custom hook", 60, "en");
    expect(p).toContain("My custom hook");
    // 60s @ 150wpm = 150 words, ±10%
    expect(p).toContain("135–165 words");
  });

  it("supports Bahasa Indonesia", () => {
    expect(scriptPrompt("hook", 15, "id")).toContain("Bahasa Indonesia");
  });

  it("includes all three beat markers", () => {
    const p = scriptPrompt("hook", 30, "en");
    expect(p).toContain("[HOOK]");
    expect(p).toContain("[BODY]");
    expect(p).toContain("[CLIFFHANGER]");
  });
});

describe("captionPrompt", () => {
  it("matches snapshot", () => {
    expect(
      captionPrompt("deep sea creatures", "x", "Test hook"),
    ).toMatchSnapshot();
  });

  it("enforces the X 280-char limit", () => {
    expect(captionPrompt("cats", "x")).toContain("280");
  });

  it("enforces the TikTok 150-char limit", () => {
    expect(captionPrompt("cats", "tiktok")).toContain("150");
  });

  it("includes hook context when provided", () => {
    expect(captionPrompt("cats", "instagram", "My hook")).toContain("My hook");
  });

  it("omits hook context cleanly when not provided", () => {
    expect(captionPrompt("cats", "instagram")).not.toContain("undefined");
  });
});

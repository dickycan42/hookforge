// Unit tests for the 4-check hook gate (src/lib/hook-gate.ts).
// Pure functions — no I/O, fully deterministic.

import { describe, it, expect } from "vitest";
import {
  noEarlyReveal,
  withholdsAnswer,
  hasOpenLoop,
  isConversational,
  validateHook,
} from "./hook-gate";

describe("noEarlyReveal", () => {
  it("passes when topic keywords are absent from the first 8 words", () => {
    expect(
      noEarlyReveal(
        "Stop scrolling — this will change your mornings forever...",
        "morning coffee routine",
      ),
    ).toBe(true);
  });

  it("fails when a topic keyword appears in the first 8 words", () => {
    expect(
      noEarlyReveal(
        "Octopus facts will blow your mind, but wait...",
        "octopus facts",
      ),
    ).toBe(false);
  });

  it("ignores stopwords when building keywords", () => {
    // "the" is a stopword — its presence must not fail the check.
    expect(noEarlyReveal("The truth about habits nobody mentions...", "the")).toBe(
      true,
    );
  });

  it("passes when the topic has no usable keywords", () => {
    expect(noEarlyReveal("Any hook at all...", "")).toBe(true);
    expect(noEarlyReveal("Any hook at all...", "a an the")).toBe(true);
  });

  it("passes when keywords appear only after the first 8 words", () => {
    expect(
      noEarlyReveal(
        "Stop scrolling right now — what nobody ever tells you about octopus will surprise you...",
        "octopus",
      ),
    ).toBe(true);
  });
});

describe("withholdsAnswer", () => {
  it("passes for a pure tease with no payoff", () => {
    expect(withholdsAnswer("What if everything you knew was wrong...?")).toBe(
      true,
    );
  });

  it("fails on 'here's the answer'", () => {
    expect(
      withholdsAnswer("Here's the answer: it's because of gravity..."),
    ).toBe(false);
  });

  it("fails on 'the reason is'", () => {
    expect(
      withholdsAnswer("The reason is simple — watch till the end"),
    ).toBe(false);
  });

  it("fails on 'because' payoff", () => {
    expect(
      withholdsAnswer("Nobody talks about this because brands hide it"),
    ).toBe(false);
  });

  it("fails on 'simply put' / 'in short'", () => {
    expect(withholdsAnswer("Simply put, hooks beat hashtags")).toBe(false);
    expect(withholdsAnswer("In short, stop posting daily")).toBe(false);
  });
});

describe("hasOpenLoop", () => {
  it("passes on an unanswered question", () => {
    expect(hasOpenLoop("What happens when you stop posting for 30 days?")).toBe(
      true,
    );
  });

  it("passes on ellipsis", () => {
    expect(hasOpenLoop("Wait for the twist at the end...")).toBe(true);
  });

  it("passes on 'nobody tells' / 'secret' patterns", () => {
    expect(hasOpenLoop("Nobody tells beginners this secret...")).toBe(true);
  });

  it("passes on a 'but' turn", () => {
    expect(hasOpenLoop("It worked for months, but then everything changed")).toBe(
      true,
    );
  });

  it("fails on a closed statement with no loop", () => {
    expect(hasOpenLoop("This is a great video about cats.")).toBe(false);
  });
});

describe("isConversational", () => {
  it("passes for spoken, direct hooks", () => {
    expect(isConversational("You won't believe what happened next...")).toBe(
      true,
    );
  });

  it("fails on 'An X is a...' definitions", () => {
    expect(
      isConversational("An octopus is a sea creature that has three hearts..."),
    ).toBe(false);
  });

  it("fails on 'is defined as'", () => {
    expect(
      isConversational("Photosynthesis is defined as the process by which..."),
    ).toBe(false);
  });

  it("fails on 'refers to'", () => {
    expect(
      isConversational("This term refers to a content strategy..."),
    ).toBe(false);
  });
});

describe("validateHook", () => {
  it("passes a well-formed hook on all 4 checks", () => {
    const result = validateHook(
      "Stop scrolling right now — what nobody ever tells you will change your views on video hooks...",
      "video hooks",
    );
    expect(result.passed).toBe(true);
    expect(result.checks).toEqual({
      noEarlyReveal: true,
      withholdsAnswer: true,
      hasOpenLoop: true,
      isConversational: true,
    });
  });

  it("reports exactly which checks failed", () => {
    const result = validateHook(
      "An octopus is a sea creature because it has three hearts.",
      "octopus",
    );
    expect(result.passed).toBe(false);
    expect(result.checks.noEarlyReveal).toBe(false); // "octopus" in first 8
    expect(result.checks.withholdsAnswer).toBe(false); // "because"
    expect(result.checks.hasOpenLoop).toBe(false); // no loop
    expect(result.checks.isConversational).toBe(false); // definition
  });

  it("fails a hook that reveals the answer even if other checks pass", () => {
    const result = validateHook(
      "Stop scrolling — here's the answer about morning routines...",
      "evening habits",
    );
    expect(result.checks.withholdsAnswer).toBe(false);
    expect(result.passed).toBe(false);
  });
});

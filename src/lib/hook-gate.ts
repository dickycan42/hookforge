// HookForge 4-check hook gate.
// Pure functions only — no I/O, no side effects. Fully covered by Vitest.

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "of", "to", "in", "on", "for",
  "with", "about", "is", "are", "was", "were", "be", "been", "it", "its",
  "this", "that", "these", "those", "you", "your", "we", "they", "he",
  "she", "at", "by", "from", "as", "do", "does", "did", "will", "would",
  "can", "could", "should", "how", "what", "when", "where", "why", "which",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function topicKeywords(topic: string): string[] {
  return tokenize(topic).filter((w) => !STOPWORDS.has(w) && w.length > 2);
}

/**
 * Check 1 — no early reveal: topic keywords must not appear
 * in the first 8 words of the hook (~2 seconds of reading).
 */
export function noEarlyReveal(hook: string, topic: string): boolean {
  const keywords = topicKeywords(topic);
  if (keywords.length === 0) return true;
  const firstEight = new Set(tokenize(hook).slice(0, 8));
  return !keywords.some((k) => firstEight.has(k));
}

const PAYOFF_PATTERNS: RegExp[] = [
  /\bbecause\b/i,
  /\bthe answer is\b/i,
  /\bit'?s because\b/i,
  /\bthe reason is\b/i,
  /\bhere'?s the answer\b/i,
  /\bsimply put\b/i,
  /\bin short\b/i,
];

/**
 * Check 2 — withholds answer: no payoff phrases that resolve
 * the curiosity inside the hook itself.
 */
export function withholdsAnswer(hook: string): boolean {
  return !PAYOFF_PATTERNS.some((p) => p.test(hook));
}

const OPEN_LOOP_PATTERNS: RegExp[] = [
  /\?/, // unanswered question
  /\.\.\./, // ellipsis
  /\bwhat if\b/i,
  /\bimagine\b/i,
  /\bnobody (tells|told|talks|mentions)\b/i,
  /\bsecret\b/i,
  /\bthe truth about\b/i,
  /\bhere'?s why\b/i,
  /\byou won'?t believe\b/i,
  /\bstop doing\b/i,
  /\buntil\b/i,
  /\bbut\b/i, // "but..." turn — the classic withheld payoff
  /\bwait for\b/i,
  /\bstay till the end\b/i,
];

/**
 * Check 3 — open loop: the hook must leave something unanswered.
 */
export function hasOpenLoop(hook: string): boolean {
  return OPEN_LOOP_PATTERNS.some((p) => p.test(hook));
}

const DEFINITION_PATTERNS: RegExp[] = [
  /^\s*(an?|the)\s+[\w'-]+\s+is\s+(a|an|the)\b/i, // "An octopus is a..."
  /\bis defined as\b/i,
  /\brefers to\b/i,
  /\bcan be described as\b/i,
];

/**
 * Check 4 — conversational: reject definition/lecture patterns.
 */
export function isConversational(hook: string): boolean {
  return !DEFINITION_PATTERNS.some((p) => p.test(hook));
}

export interface HookGateChecks {
  noEarlyReveal: boolean;
  withholdsAnswer: boolean;
  hasOpenLoop: boolean;
  isConversational: boolean;
}

export interface HookGateResult {
  passed: boolean;
  checks: HookGateChecks;
}

/** Run all 4 checks against a hook + topic pair. */
export function validateHook(hook: string, topic: string): HookGateResult {
  const checks: HookGateChecks = {
    noEarlyReveal: noEarlyReveal(hook, topic),
    withholdsAnswer: withholdsAnswer(hook),
    hasOpenLoop: hasOpenLoop(hook),
    isConversational: isConversational(hook),
  };
  return {
    passed: Object.values(checks).every(Boolean),
    checks,
  };
}

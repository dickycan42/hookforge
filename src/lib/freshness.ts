// Topic freshness check — fuzzy dedupe over 90-day history.
// Uses Upstash Redis when configured; degrades to "unknown" without it.

import { Redis } from "@upstash/redis";

export const FRESHNESS_THRESHOLD = 0.8;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const REDIS_KEY = "hookforge:topics";

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

/** Normalize a topic to a sorted, deduped keyword list. */
export function normalizeTopic(topic: string): string[] {
  return [
    ...new Set(tokenize(topic).filter((w) => !STOPWORDS.has(w) && w.length > 2)),
  ].sort();
}

/** Jaccard similarity between two keyword lists (0–1). */
export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

interface StoredTopic {
  /** normalized keyword string (member identity) */
  t: string;
  /** original topic text, for the warning banner */
  orig: string;
  /** ISO timestamp of first use */
  at: string;
}

export interface FreshnessResult {
  status: "fresh" | "stale" | "unknown";
  /** similarity of the closest match (0–1), when stale */
  similarity?: number;
  /** ISO date the matched topic was last used, when stale */
  lastUsed?: string;
  /** original text of the matched topic, when stale */
  matchedTopic?: string;
}

/**
 * Fuzzy-match a topic against the last 90 days of history.
 * Returns "unknown" when Redis is not configured — generation continues.
 */
export async function checkFreshness(topic: string): Promise<FreshnessResult> {
  const redis = getRedis();
  if (!redis) return { status: "unknown" };

  const now = Date.now();
  const cutoff = now - NINETY_DAYS_MS;
  const keywords = normalizeTopic(topic);

  try {
    // prune entries older than 90 days
    await redis.zremrangebyscore(REDIS_KEY, 0, cutoff);

    const members = await redis.zrange<string[]>(
      REDIS_KEY,
      cutoff,
      now,
      { byScore: true },
    );

    let best: StoredTopic | null = null;
    let bestScore = 0;

    for (const raw of members) {
      let stored: StoredTopic;
      try {
        stored = JSON.parse(raw) as StoredTopic;
      } catch {
        continue;
      }
      const score = jaccardSimilarity(keywords, stored.t.split(" "));
      if (score > bestScore) {
        bestScore = score;
        best = stored;
      }
    }

    if (best && bestScore >= FRESHNESS_THRESHOLD) {
      return {
        status: "stale",
        similarity: Math.round(bestScore * 100) / 100,
        lastUsed: best.at,
        matchedTopic: best.orig,
      };
    }
    return { status: "fresh" };
  } catch {
    // Redis down — degrade, never block generation
    return { status: "unknown" };
  }
}

/** Record a topic into the 90-day history (no-op without Redis). */
export async function recordTopic(topic: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const stored: StoredTopic = {
    t: normalizeTopic(topic).join(" "),
    orig: topic.slice(0, 120),
    at: new Date().toISOString(),
  };

  try {
    await redis.zadd(REDIS_KEY, {
      score: Date.now(),
      member: JSON.stringify(stored),
    });
  } catch {
    // best-effort only
  }
}

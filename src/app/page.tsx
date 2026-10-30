"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GenType = "hooks" | "script" | "caption";
type Platform = "tiktok" | "instagram" | "youtube" | "x";

interface FreshnessResult {
  status: "fresh" | "stale" | "unknown";
  similarity?: number;
  lastUsed?: string;
  matchedTopic?: string;
}

interface HistoryEntry {
  id: string;
  topic: string;
  type: GenType;
  platform: Platform;
  output: string;
  gate?: string;
  createdAt: number;
}

const HISTORY_KEY = "hookforge-history";
const MAX_HISTORY = 20;

const TABS: { id: GenType; label: string; blurb: string }[] = [
  { id: "hooks", label: "Hooks", blurb: "5 scroll-stopping hooks, quality-gated" },
  { id: "script", label: "Script", blurb: "Full narration script with beats" },
  { id: "caption", label: "Caption", blurb: "Platform-ready caption" },
];

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube Shorts" },
  { id: "x", label: "X" },
];

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function parseHookLines(text: string): { framework: string; hook: string; review: boolean }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const review = line.endsWith("[review]");
      const clean = review ? line.slice(0, -"[review]".length).trim() : line;
      const m = clean.match(/^\[([\w-]+)\]\s*([\s\S]*)$/);
      if (m) return { framework: m[1], hook: m[2].trim(), review };
      return { framework: "hook", hook: clean, review };
    });
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("tiktok");
  const [tab, setTab] = useState<GenType>("hooks");
  const [scriptHook, setScriptHook] = useState("");
  const [durationSec, setDurationSec] = useState<15 | 30 | 60>(30);
  const [lang, setLang] = useState<"en" | "id">("en");
  const [output, setOutput] = useState("");
  const [gate, setGate] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<FreshnessResult | null>(null);
  const [checkingFreshness, setCheckingFreshness] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load history once.
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const saveHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* storage full — ignore */
      }
      return next;
    });
  }, []);

  // Debounced freshness check.
  useEffect(() => {
    const t = topic.trim();
    if (t.length < 3) {
      setFreshness(null);
      return;
    }
    setCheckingFreshness(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch("/api/freshness", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: t }),
        });
        if (res.ok) {
          const data = (await res.json()) as FreshnessResult;
          setFreshness(data);
        }
      } catch {
        /* non-blocking */
      } finally {
        setCheckingFreshness(false);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [topic]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const generate = useCallback(async () => {
    const t = topic.trim();
    if (!t || loading) return;
    stop();
    setError(null);
    setOutput("");
    setGate(null);
    setMockMode(false);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const body: Record<string, unknown> = { type: tab, topic: t, platform };
    if (tab === "script") {
      body.hook = scriptHook.trim();
      body.durationSec = durationSec;
      body.lang = lang;
    }
    if (tab === "caption" && scriptHook.trim()) body.hook = scriptHook.trim();

    let streamed = "";
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Request failed (${res.status}).`);
      }
      setGate(res.headers.get("X-HookForge-Gate"));
      setMockMode(res.headers.get("X-HookForge-Mock") === "1");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming not supported.");
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        streamed += decoder.decode(value, { stream: true });
        setOutput(streamed);
      }
      streamed += decoder.decode();
      setOutput(streamed);

      if (streamed.trim()) {
        saveHistory({
          id: `${Date.now()}`,
          topic: t,
          type: tab,
          platform,
          output: streamed,
          gate: res.headers.get("X-HookForge-Gate") ?? undefined,
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Generation failed.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [topic, tab, platform, scriptHook, durationSec, lang, loading, stop, saveHistory]);

  const copyText = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  const loadEntry = useCallback((entry: HistoryEntry) => {
    setTopic(entry.topic);
    setTab(entry.type);
    setPlatform(entry.platform);
    setOutput(entry.output);
    setGate(entry.gate ?? null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const sendHookToScript = useCallback((hook: string) => {
    setScriptHook(hook);
    setTab("script");
  }, []);

  const hookLines = tab === "hooks" ? parseHookLines(output) : [];

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight">
          <span aria-hidden>🔥</span> HookForge
        </h1>
        <p className="mt-2 text-zinc-400">
          AI hooks, scripts &amp; captions for faceless creators — one topic in,
          scroll-stopping content out.
        </p>
      </header>

      {/* Topic input */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <label htmlFor="topic" className="mb-2 block text-sm font-medium text-zinc-300">
          Topic
        </label>
        <input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") generate();
          }}
          placeholder="e.g. why octopuses have three hearts"
          maxLength={200}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
        />

        {/* Platform selector */}
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Platform">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              aria-pressed={platform === p.id}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                platform === p.id
                  ? "bg-orange-500 text-zinc-950"
                  : "border border-zinc-700 text-zinc-300 hover:border-zinc-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Freshness banner */}
        {checkingFreshness && topic.trim().length >= 3 && (
          <p className="mt-3 text-sm text-zinc-500">Checking topic freshness…</p>
        )}
        {!checkingFreshness && freshness?.status === "stale" && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            <span className="font-semibold">⚠️ Topic may be stale.</span>{" "}
            Similar to “{freshness.matchedTopic}”
            {typeof freshness.similarity === "number" && (
              <> ({Math.round(freshness.similarity * 100)}% match)</>
            )}
            {freshness.lastUsed && (
              <> — last used {new Date(freshness.lastUsed).toLocaleDateString()}</>
            )}
            . Consider a fresh angle.
          </div>
        )}
        {!checkingFreshness && freshness?.status === "fresh" && (
          <p className="mt-3 text-sm text-emerald-400">✅ Topic looks fresh — not used recently.</p>
        )}

        {/* Tabs */}
        <div className="mt-5 grid grid-cols-3 gap-2" role="tablist" aria-label="Generation type">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                tab === t.id
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-600"
              }`}
            >
              <div className={`text-sm font-semibold ${tab === t.id ? "text-orange-400" : "text-zinc-200"}`}>
                {t.label}
              </div>
              <div className="mt-0.5 hidden text-xs text-zinc-500 sm:block">{t.blurb}</div>
            </button>
          ))}
        </div>

        {/* Script options */}
        {tab === "script" && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="hook" className="mb-1 block text-xs font-medium text-zinc-400">
                Opening hook (optional — pick one from Hooks)
              </label>
              <input
                id="hook"
                value={scriptHook}
                onChange={(e) => setScriptHook(e.target.value)}
                placeholder="Leave empty for auto hook"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end gap-4">
              <div>
                <span className="mb-1 block text-xs font-medium text-zinc-400">Duration</span>
                <div className="flex gap-1.5">
                  {([15, 30, 60] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDurationSec(d)}
                      aria-pressed={durationSec === d}
                      className={`rounded-lg px-3 py-1.5 text-sm ${
                        durationSec === d
                          ? "bg-orange-500 text-zinc-950 font-semibold"
                          : "border border-zinc-700 text-zinc-300"
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1 block text-xs font-medium text-zinc-400">Language</span>
                <div className="flex gap-1.5">
                  {(["en", "id"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLang(l)}
                      aria-pressed={lang === l}
                      className={`rounded-lg px-3 py-1.5 text-sm uppercase ${
                        lang === l
                          ? "bg-orange-500 text-zinc-950 font-semibold"
                          : "border border-zinc-700 text-zinc-300"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Caption hint */}
        {tab === "caption" && (
          <p className="mt-3 text-xs text-zinc-500">
            Tip: paste a hook into the Script tab&apos;s hook field, or add one below to
            anchor the caption.
          </p>
        )}
        {(tab === "caption" || tab === "hooks") && (
          <div className="mt-3">
            <label htmlFor="anchor-hook" className="mb-1 block text-xs font-medium text-zinc-400">
              Anchor hook (optional)
            </label>
            <input
              id="anchor-hook"
              value={scriptHook}
              onChange={(e) => setScriptHook(e.target.value)}
              placeholder="Optional hook to anchor the output"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none"
            />
          </div>
        )}

        {/* Generate button */}
        <div className="mt-5 flex items-center gap-3">
          {!loading ? (
            <button
              type="button"
              onClick={generate}
              disabled={!topic.trim()}
              className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Generate {tab === "hooks" ? "hooks" : tab}
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="rounded-xl border border-red-500/60 px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              ⏹ Stop
            </button>
          )}
          {loading && <span className="text-sm text-zinc-500">Streaming…</span>}
        </div>

        {error && (
          <div role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
      </section>

      {/* Output */}
      {(output || loading) && (
        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Output
              {gate && <span className="ml-2 text-emerald-400">gate {gate}</span>}
              {mockMode && (
                <span className="ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-300">
                  mock
                </span>
              )}
            </h2>
            {output && (
              <button
                type="button"
                onClick={() => copyText(output, "all")}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-500"
              >
                {copiedId === "all" ? "✓ Copied" : "Copy all"}
              </button>
            )}
          </div>

          {tab === "hooks" ? (
            <ul className="space-y-2.5">
              {hookLines.map((h, i) => (
                <li
                  key={i}
                  className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 ${
                    h.review ? "border-amber-500/40 bg-amber-500/5" : "border-zinc-800 bg-zinc-950/70"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="mr-2 inline-block rounded bg-orange-500/15 px-1.5 py-0.5 text-xs font-semibold text-orange-400">
                      {h.framework}
                    </span>
                    <span className="text-zinc-100">{h.hook}</span>
                    {h.review && (
                      <span className="ml-2 text-xs text-amber-400">[needs review]</span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => copyText(h.hook, `hook-${i}`)}
                      title="Copy hook"
                      className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                    >
                      {copiedId === `hook-${i}` ? "✓" : "Copy"}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendHookToScript(h.hook)}
                      title="Use as script hook"
                      className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-orange-500 hover:text-orange-400"
                    >
                      → Script
                    </button>
                  </div>
                </li>
              ))}
              {!output && loading && <li className="text-sm text-zinc-500">Generating hooks…</li>}
            </ul>
          ) : (
            <div
              ref={outputRef}
              className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm leading-relaxed text-zinc-100"
            >
              {output || <span className="text-zinc-500">Generating…</span>}
              {loading && <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-orange-500" />}
            </div>
          )}
        </section>
      )}

      {/* History */}
      <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            History {history.length > 0 && <span className="text-zinc-600">({history.length})</span>}
          </h2>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-zinc-500 hover:text-red-400"
            >
              Clear all
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-600">
            Nothing yet — your generations are saved here on this device.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800/70">
            {history.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <button
                  type="button"
                  onClick={() => loadEntry(e)}
                  className="min-w-0 flex-1 truncate text-left text-sm text-zinc-300 hover:text-orange-400"
                  title="Load this generation"
                >
                  <span className="mr-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs capitalize text-zinc-400">
                    {e.type}
                  </span>
                  {e.topic}
                </button>
                <span className="shrink-0 text-xs text-zinc-600">
                  {new Date(e.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <button
                  type="button"
                  onClick={() => deleteEntry(e.id)}
                  aria-label="Delete entry"
                  className="shrink-0 text-xs text-zinc-600 hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-10 text-center text-xs text-zinc-600">
        HookForge — built for Kiroween 2026 · Frankenstein category
      </footer>
    </main>
  );
}

// POST /api/freshness — topic freshness check (fuzzy dedupe, 90-day window).
//
// Body: { topic: string, record?: boolean }
// - Always returns the freshness verdict for `topic`.
// - When `record: true` and the verdict is "fresh", the topic is also
//   appended to history (so the next check sees it).
// - Without Redis configured the verdict is "unknown" and generation
//   continues — never a blocker.

import { checkFreshness, recordTopic } from "@/lib/freshness";

export async function POST(req: Request): Promise<Response> {
  let body: { topic?: unknown; record?: unknown };
  try {
    body = (await req.json()) as { topic?: unknown; record?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) {
    return Response.json({ error: "topic is required." }, { status: 400 });
  }
  if (topic.length > 200) {
    return Response.json(
      { error: "topic must be 200 characters or fewer." },
      { status: 400 },
    );
  }

  const result = await checkFreshness(topic);

  if (body.record === true && result.status === "fresh") {
    await recordTopic(topic);
  }

  return Response.json(result);
}

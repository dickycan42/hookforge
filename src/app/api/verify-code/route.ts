// POST /api/verify-code — validate a HookForge access code.
//
// Body: { code: string }
// Returns: { valid: boolean }

import { isValidAccessCode } from "@/lib/access-codes";

export async function POST(req: Request): Promise<Response> {
  let body: { code?: unknown };
  try {
    body = (await req.json()) as { code?: unknown };
  } catch {
    return Response.json({ valid: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!code) {
    return Response.json({ valid: false, error: "code is required." }, { status: 400 });
  }

  return Response.json({ valid: isValidAccessCode(code) });
}

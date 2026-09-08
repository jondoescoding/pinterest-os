import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function unauthorized(): Response {
  return Response.json(
    { ok: false, error: "Unauthorized" },
    {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    },
  );
}

/**
 * Protects machine-to-machine endpoints with a server-side bearer token.
 * Returns a response when access must stop, or null when the caller is allowed.
 */
export function authorizeApiRequest(req: Request): Response | null {
  const expected = process.env.PINTEREST_OS_API_KEY?.trim();
  if (!expected) {
    return Response.json(
      {
        ok: false,
        error: "PINTEREST_OS_API_KEY is not configured",
      },
      { status: 503 },
    );
  }

  const authorization = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  const supplied = match?.[1]?.trim();
  if (!supplied) return unauthorized();

  return timingSafeEqual(digest(supplied), digest(expected))
    ? null
    : unauthorized();
}

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function secureEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function basicCredentials(
  authorization: string,
): { username: string; password: string } | null {
  const match = /^Basic\s+(.+)$/i.exec(authorization);
  if (!match?.[1]) return null;

  try {
    const decoded = atob(match[1]);
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function bearerToken(authorization: string): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return match?.[1]?.trim() || null;
}

function unavailable(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Access control is not configured. Set PINTEREST_OS_USERNAME and PINTEREST_OS_PASSWORD.",
    },
    { status: 503 },
  );
}

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Basic realm="Pinterest OS", charset="UTF-8"',
    },
  });
}

/**
 * Protects every dashboard page and API route.
 *
 * Browsers use Basic authentication. Trusted automation may use the
 * PINTEREST_OS_API_KEY bearer token.
 */
export function middleware(req: NextRequest): NextResponse {
  const expectedUsername = process.env.PINTEREST_OS_USERNAME?.trim();
  const expectedPassword = process.env.PINTEREST_OS_PASSWORD;
  const expectedApiKey = process.env.PINTEREST_OS_API_KEY?.trim();
  const hasBrowserCredentials = Boolean(expectedUsername && expectedPassword);
  const hasApiCredentials = Boolean(expectedApiKey);

  if (!hasBrowserCredentials && !hasApiCredentials) return unavailable();

  const authorization = req.headers.get("authorization") ?? "";
  const basic = basicCredentials(authorization);
  if (
    basic &&
    expectedUsername &&
    expectedPassword &&
    secureEqual(basic.username, expectedUsername) &&
    secureEqual(basic.password, expectedPassword)
  ) {
    return NextResponse.next();
  }

  const bearer = bearerToken(authorization);
  if (bearer && expectedApiKey && secureEqual(bearer, expectedApiKey)) {
    return NextResponse.next();
  }

  return unauthorized();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
  ],
};

import { middleware } from "@/middleware";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

function request(authorization?: string, pathname = "/campaigns"): NextRequest {
  const headers = authorization ? { authorization } : undefined;
  return new NextRequest(`https://pinterest-os.example.com${pathname}`, {
    headers,
  });
}

function basic(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

afterEach(() => {
  process.env.PINTEREST_OS_USERNAME = undefined;
  process.env.PINTEREST_OS_PASSWORD = undefined;
  process.env.PINTEREST_OS_API_KEY = undefined;
});

describe("repository-wide access middleware", () => {
  it("fails closed when no access method is configured", () => {
    expect(middleware(request()).status).toBe(503);
  });

  it("rejects missing or incorrect credentials", () => {
    process.env.PINTEREST_OS_USERNAME = "operator";
    process.env.PINTEREST_OS_PASSWORD = "correct horse battery staple";

    expect(middleware(request()).status).toBe(401);
    expect(middleware(request(basic("operator", "wrong"))).status).toBe(401);
  });

  it("accepts configured browser credentials", () => {
    process.env.PINTEREST_OS_USERNAME = "operator";
    process.env.PINTEREST_OS_PASSWORD = "correct horse battery staple";

    const response = middleware(
      request(basic("operator", "correct horse battery staple")),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("accepts the machine API bearer token", () => {
    process.env.PINTEREST_OS_API_KEY = "machine-token";

    const response = middleware(request("Bearer machine-token"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});

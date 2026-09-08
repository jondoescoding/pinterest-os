import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/postiz", () => ({
  createPost: vi.fn(),
}));

vi.mock("@/lib/postiz-publish-requests", () => ({
  claimPostizPublishRequest: vi.fn(),
  completePostizPublishRequest: vi.fn(),
  failPostizPublishRequest: vi.fn(),
}));

import { POST } from "@/app/api/publish/postiz/route";
import { createPost } from "@/lib/postiz";
import {
  claimPostizPublishRequest,
  completePostizPublishRequest,
  failPostizPublishRequest,
} from "@/lib/postiz-publish-requests";

const createPostMock = vi.mocked(createPost);
const claimRequestMock = vi.mocked(claimPostizPublishRequest);
const completeRequestMock = vi.mocked(completePostizPublishRequest);
const failRequestMock = vi.mocked(failPostizPublishRequest);

function request(
  body: unknown,
  token = "inbound-test-key",
  key: string | null = "test-request-key-0001",
): Request {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (key) headers["Idempotency-Key"] = key;

  return new Request("http://localhost/api/publish/postiz", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(process.env, "PINTEREST_OS_API_KEY");
  claimRequestMock.mockResolvedValue({ state: "claimed" });
  completeRequestMock.mockResolvedValue(undefined);
  failRequestMock.mockResolvedValue(undefined);
});

describe("POST /api/publish/postiz", () => {
  it("fails closed when inbound API authentication is not configured", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(503);
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid caller token", async () => {
    process.env.PINTEREST_OS_API_KEY = "correct-key";

    const response = await POST(request({}, "wrong-key"));

    expect(response.status).toBe(401);
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("requires an idempotency key before publishing", async () => {
    process.env.PINTEREST_OS_API_KEY = "inbound-test-key";

    const response = await POST(request({}, "inbound-test-key", null));

    expect(response.status).toBe(400);
    expect(claimRequestMock).not.toHaveBeenCalled();
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("publishes through Postiz", async () => {
    process.env.PINTEREST_OS_API_KEY = "inbound-test-key";
    createPostMock.mockResolvedValue({ id: "postiz-post-1" });

    const response = await POST(
      request({
        mode: "schedule",
        integrationId: "postiz-integration-1",
        boardId: "pinterest-board-1",
        title: "Standalone pin",
        description: "Published through Postiz.",
        imageUrl: "https://cdn.example.com/pin.jpg",
        destinationUrl: "https://example.com/product",
        scheduledAt: "2026-08-15T14:00:00.000Z",
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      provider: "postiz",
      idempotencyKey: "test-request-key-0001",
      idempotentReplay: false,
    });
    expect(claimRequestMock).toHaveBeenCalledWith(
      "test-request-key-0001",
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(createPostMock).toHaveBeenCalledWith({
      integrationId: "postiz-integration-1",
      boardId: "pinterest-board-1",
      platform: "pinterest",
      title: "Standalone pin",
      content: "Published through Postiz.",
      images: ["https://cdn.example.com/pin.jpg"],
      link: "https://example.com/product",
      date: "2026-08-15T14:00:00.000Z",
      type: "schedule",
    });
    expect(completeRequestMock).toHaveBeenCalledWith(
      "test-request-key-0001",
      expect.objectContaining({
        ok: true,
        idempotentReplay: false,
      }),
    );
  });

  it("requires HTTPS media URLs", async () => {
    process.env.PINTEREST_OS_API_KEY = "inbound-test-key";

    const response = await POST(
      request({
        mode: "now",
        integrationId: "postiz-integration-1",
        boardId: "pinterest-board-1",
        title: "Unsafe image",
        imageUrl: "http://localhost/private.jpg",
      }),
    );

    expect(response.status).toBe(400);
    expect(claimRequestMock).not.toHaveBeenCalled();
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("replays a completed request without calling Postiz again", async () => {
    process.env.PINTEREST_OS_API_KEY = "inbound-test-key";
    claimRequestMock.mockResolvedValue({
      state: "complete",
      response: {
        ok: true,
        provider: "postiz",
        result: { id: "postiz-post-1" },
      },
    });

    const response = await POST(
      request({
        mode: "now",
        integrationId: "postiz-integration-1",
        boardId: "pinterest-board-1",
        title: "Standalone pin",
        imageUrl: "https://cdn.example.com/pin.jpg",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      idempotencyKey: "test-request-key-0001",
      idempotentReplay: true,
    });
    expect(createPostMock).not.toHaveBeenCalled();
    expect(completeRequestMock).not.toHaveBeenCalled();
  });

  it("rejects reuse of a key for a different payload", async () => {
    process.env.PINTEREST_OS_API_KEY = "inbound-test-key";
    claimRequestMock.mockResolvedValue({ state: "conflict" });

    const response = await POST(
      request({
        mode: "now",
        integrationId: "postiz-integration-1",
        boardId: "pinterest-board-1",
        title: "Standalone pin",
        imageUrl: "https://cdn.example.com/pin.jpg",
      }),
    );

    expect(response.status).toBe(409);
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("blocks a concurrent request that is still in progress", async () => {
    process.env.PINTEREST_OS_API_KEY = "inbound-test-key";
    claimRequestMock.mockResolvedValue({ state: "in_progress" });

    const response = await POST(
      request({
        mode: "now",
        integrationId: "postiz-integration-1",
        boardId: "pinterest-board-1",
        title: "Standalone pin",
        imageUrl: "https://cdn.example.com/pin.jpg",
      }),
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("requires reconciliation after an ambiguous failed attempt", async () => {
    process.env.PINTEREST_OS_API_KEY = "inbound-test-key";
    claimRequestMock.mockResolvedValue({
      state: "failed",
      failureMessage: "Postiz request failed",
    });

    const response = await POST(
      request({
        mode: "now",
        integrationId: "postiz-integration-1",
        boardId: "pinterest-board-1",
        title: "Standalone pin",
        imageUrl: "https://cdn.example.com/pin.jpg",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      reconciliationRequired: true,
    });
    expect(createPostMock).not.toHaveBeenCalled();
  });

  it("records a provider failure before returning it", async () => {
    process.env.PINTEREST_OS_API_KEY = "inbound-test-key";
    createPostMock.mockRejectedValue(
      new Error("Postiz request failed: timeout"),
    );

    const response = await POST(
      request({
        mode: "now",
        integrationId: "postiz-integration-1",
        boardId: "pinterest-board-1",
        title: "Standalone pin",
        imageUrl: "https://cdn.example.com/pin.jpg",
      }),
    );

    expect(response.status).toBe(502);
    expect(failRequestMock).toHaveBeenCalledWith(
      "test-request-key-0001",
      "Postiz request failed: timeout",
    );
  });
});

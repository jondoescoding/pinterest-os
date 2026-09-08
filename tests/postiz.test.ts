import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPost,
  isAllowedChannelPlatform,
  normalizePlatform,
} from "../lib/postiz";

afterEach(() => {
  vi.restoreAllMocks();
  process.env.POSTIZ_API_KEY = undefined;
});

describe("Postiz channel filtering", () => {
  it("normalizes Pinterest and TikTok platform names", () => {
    expect(normalizePlatform("Pinterest")).toBe("pinterest");
    expect(normalizePlatform("provider-tiktok-business")).toBe("tiktok");
    expect(normalizePlatform("instagram")).toBe("instagram");
  });

  it("only allows Pinterest and TikTok channels", () => {
    expect(isAllowedChannelPlatform("pinterest")).toBe(true);
    expect(isAllowedChannelPlatform("tiktok")).toBe(true);
    expect(isAllowedChannelPlatform("instagram")).toBe(false);
    expect(isAllowedChannelPlatform(null)).toBe(false);
  });
});

describe("Postiz Pinterest payload", () => {
  it("uploads media and sends Pinterest title/link settings", async () => {
    process.env.POSTIZ_API_KEY = "test-key";
    const requests: { url: string; body: unknown }[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      requests.push({
        url: String(url),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (String(url).endsWith("/upload-from-url")) {
        return Response.json({ id: "media-1", path: "media/path.jpg" });
      }
      return Response.json({ id: "post-1" });
    });

    await createPost({
      integrationId: "board-1",
      boardId: "board-1",
      platform: "pinterest",
      title: "Gym girl routine",
      content: "Gym girl routine\n\nA focused training reset.",
      images: ["https://example.com/image.jpg"],
      link: "https://dim0k2-iy.myshopify.com/",
      date: "2026-06-30T14:00:00.000Z",
    });

    expect(requests).toHaveLength(2);
    expect(requests[1]?.body).toMatchObject({
      type: "schedule",
      posts: [
        {
          integration: { id: "board-1" },
          settings: {
            __type: "pinterest",
            board: "board-1",
            title: "Gym girl routine",
            link: "https://dim0k2-iy.myshopify.com/",
          },
          value: [
            {
              image: [{ id: "media-1", path: "media/path.jpg" }],
            },
          ],
        },
      ],
    });
  });
});

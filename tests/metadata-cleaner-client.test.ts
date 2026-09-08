import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanFinalPosterMetadata } from "../lib/metadata-cleaner";
import { stripImageMetadata } from "../lib/strip-metadata";

vi.mock("../lib/strip-metadata", () => ({
  stripImageMetadata: vi.fn(async (image: Buffer) => image),
}));

afterEach(() => {
  vi.restoreAllMocks();
  process.env.METADATA_CLEANER_URL = undefined;
  process.env.METADATA_CLEANER_TOKEN = undefined;
});

describe("metadata cleaner client", () => {
  it("uses the local cleaner when the VPS URL is not configured", async () => {
    const input = Buffer.from("poster");
    await expect(
      cleanFinalPosterMetadata(input, "poster.jpg"),
    ).resolves.toEqual(input);
    expect(stripImageMetadata).toHaveBeenCalledWith(input, "poster.jpg");
  });

  it("sends the final JPEG to the authenticated VPS service", async () => {
    process.env.METADATA_CLEANER_URL = "https://metadata.example.test/";
    process.env.METADATA_CLEANER_TOKEN = "private-token";
    const cleaned = Buffer.from("cleaned");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(cleaned), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "X-Metadata-Stripped": "true",
        },
      }),
    );

    await expect(
      cleanFinalPosterMetadata(Buffer.from("source"), "poster.jpg"),
    ).resolves.toEqual(cleaned);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://metadata.example.test/v1/strip-metadata",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer private-token",
          "Content-Type": "image/jpeg",
        },
      }),
    );
  });

  it("rejects an unverified cleaner response", async () => {
    process.env.METADATA_CLEANER_URL = "https://metadata.example.test";
    process.env.METADATA_CLEANER_TOKEN = "private-token";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array(Buffer.from("unknown")), { status: 200 }),
    );

    await expect(
      cleanFinalPosterMetadata(Buffer.from("source"), "poster.jpg"),
    ).rejects.toThrow("response was not verified");
  });
});

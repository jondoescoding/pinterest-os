// Strip ALL metadata (EXIF, XMP, IPTC, C2PA manifests, PNG text chunks with
// generation params, TC260 AIGC labels) from images via the remove-ai-watermarks
// CLI in metadata mode with --remove-all. Pixel data is untouched — JPEG is not
// re-encoded, so stripping is lossless and idempotent.
// Requires: uv tool install remove-ai-watermarks (on PATH).
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export async function stripImageMetadata(
  image: Buffer,
  filename = "image.png",
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "raiw-"));
  try {
    const ext = extname(filename) || ".png";
    const src = join(dir, `src${ext}`);
    const out = join(dir, `clean${ext}`);
    await writeFile(src, image);
    await execFileAsync("remove-ai-watermarks", [
      "metadata",
      src,
      "--remove",
      "--remove-all",
      "-o",
      out,
    ]);
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Download an image and return it with all metadata stripped.
export async function stripImageUrlMetadata(
  url: string,
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not download image (${res.status})`);
  }
  const contentType =
    res.headers.get("content-type")?.split(";")[0].trim() || "image/png";
  const ext = CONTENT_TYPE_EXT[contentType] ?? ".png";
  const raw = Buffer.from(await res.arrayBuffer());
  const buffer = await stripImageMetadata(raw, `image${ext}`);
  return { buffer, contentType };
}

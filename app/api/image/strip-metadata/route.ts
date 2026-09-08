import { stripImageUrlMetadata } from "@/lib/strip-metadata";

// POST /api/image/strip-metadata — download an image by URL and return it with
// ALL metadata stripped (EXIF, XMP, IPTC, C2PA, PNG text chunks, TC260).
// Idempotent: stripping an already-clean image is a no-op. Pixels untouched.
export async function POST(req: Request): Promise<Response> {
  let body: { imageUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const { imageUrl } = body;
  if (typeof imageUrl !== "string" || imageUrl.trim() === "") {
    return Response.json(
      { ok: false, error: "imageUrl is required" },
      { status: 400 },
    );
  }
  try {
    const { buffer, contentType } = await stripImageUrlMetadata(imageUrl);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "X-Metadata-Stripped": "true",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}

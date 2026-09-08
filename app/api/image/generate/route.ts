import { generateImage } from "@/lib/fal";

// POST /api/image/generate — generate one image from a prompt via fal.
// Image gen takes several seconds; the fal queue client handles the waiting.
export async function POST(req: Request): Promise<Response> {
  let body: { prompt?: unknown; model?: unknown; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  const { prompt, model, input } = body;
  if (typeof prompt !== "string" || prompt.trim() === "") {
    return Response.json(
      { ok: false, error: "prompt is required" },
      { status: 400 },
    );
  }
  if (model !== undefined && typeof model !== "string") {
    return Response.json(
      { ok: false, error: "model must be a string" },
      { status: 400 },
    );
  }
  if (
    input !== undefined &&
    (typeof input !== "object" || input === null || Array.isArray(input))
  ) {
    return Response.json(
      { ok: false, error: "input must be an object" },
      { status: 400 },
    );
  }
  try {
    const image = await generateImage({
      prompt,
      model,
      input: input as Record<string, unknown> | undefined,
    });
    return Response.json({
      ok: true,
      imageUrl: image.url,
      model: image.model,
      width: image.width,
      height: image.height,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}

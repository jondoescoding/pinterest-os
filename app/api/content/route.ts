import { createContent, listContent } from "@/lib/content";
import { CONTENT_STATES, type ContentState } from "@/lib/content-state";

// GET /api/content — list content items, newest first.
// Optional filters: ?campaignId= and ?state=.
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId") ?? undefined;
  const stateParam = searchParams.get("state") ?? undefined;

  if (
    stateParam !== undefined &&
    !CONTENT_STATES.includes(stateParam as ContentState)
  ) {
    return Response.json(
      { error: `state must be one of: ${CONTENT_STATES.join(", ")}` },
      { status: 400 },
    );
  }

  const contentItems = await listContent({
    campaignId,
    state: stateParam as ContentState | undefined,
  });
  return Response.json({ contentItems });
}

// POST /api/content — create a content item. All fields optional; state defaults to "draft".
export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    title,
    description,
    destinationUrl,
    imageUrl,
    campaignId,
    imagePrompt,
    falModel,
    state,
  } = (body ?? {}) as Record<string, unknown>;

  if (state !== undefined && !CONTENT_STATES.includes(state as ContentState)) {
    return Response.json(
      { error: `state must be one of: ${CONTENT_STATES.join(", ")}` },
      { status: 400 },
    );
  }

  const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

  const contentItem = await createContent({
    title: str(title),
    description: str(description),
    destinationUrl: str(destinationUrl),
    imageUrl: str(imageUrl),
    campaignId: str(campaignId),
    imagePrompt: str(imagePrompt),
    falModel: str(falModel),
    state: state as ContentState | undefined,
  });

  return Response.json({ contentItem }, { status: 201 });
}

import {
  type UpdateContentInput,
  deleteContent,
  getContent,
  updateContent,
} from "@/lib/content";
import { CONTENT_STATES, type ContentState } from "@/lib/content-state";
import { countSchedulesForContent } from "@/lib/schedules";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/content/[id] — one content item, 404 if absent.
export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;
  const contentItem = await getContent(id);
  if (!contentItem) {
    return Response.json({ error: "Content item not found" }, { status: 404 });
  }
  return Response.json({ contentItem });
}

// PATCH /api/content/[id] — update any subset of fields.
export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  const { id } = await params;

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

  const patch: UpdateContentInput = {};
  const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

  if (title !== undefined) patch.title = str(title);
  if (description !== undefined) patch.description = str(description);
  if (destinationUrl !== undefined) patch.destinationUrl = str(destinationUrl);
  if (imageUrl !== undefined) patch.imageUrl = str(imageUrl);
  if (campaignId !== undefined) patch.campaignId = str(campaignId);
  if (imagePrompt !== undefined) patch.imagePrompt = str(imagePrompt);
  if (falModel !== undefined) patch.falModel = str(falModel);
  if (state !== undefined) {
    if (!CONTENT_STATES.includes(state as ContentState)) {
      return Response.json(
        { error: `state must be one of: ${CONTENT_STATES.join(", ")}` },
        { status: 400 },
      );
    }
    patch.state = state as ContentState;
  }

  const contentItem = await updateContent(id, patch);
  if (!contentItem) {
    return Response.json({ error: "Content item not found" }, { status: 404 });
  }
  return Response.json({ contentItem });
}

// DELETE /api/content/[id] — remove a content item.
export async function DELETE(
  _req: Request,
  { params }: Ctx,
): Promise<Response> {
  const { id } = await params;
  const scheduleCount = await countSchedulesForContent(id);
  if (scheduleCount > 0) {
    return Response.json(
      {
        error:
          "This content is scheduled. Unschedule it before deleting the content item.",
      },
      { status: 409 },
    );
  }
  const removed = await deleteContent(id);
  if (!removed) {
    return Response.json({ error: "Content item not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
